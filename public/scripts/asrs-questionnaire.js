/**
 * ASRS Fragebogen Components
 * 
 * Implementiert den ASRS v1.1 Fragebogen als Custom Elements,
 * die vorhandene HTML-Elemente wrappen und verbesserte Funktionalität hinzufügen.
 */

/**
 * AsrsQuestion - Custom Element für eine einzelne Frage
 * Wrappt ein bestehendes Frage-Element und erweitert seine Funktionalität.
 */
class AsrsQuestion extends HTMLElement {
  constructor() {
    super();
    this._value = null;
    this._questionNumber = parseInt(this.getAttribute('question-number'));
    this._isLastQuestion = this.hasAttribute('last-question');
    this._isFirstQuestion = this.hasAttribute('first-question');
  }
  
  connectedCallback() {
    this.initializeQuestion();
  }
  
  initializeQuestion() {
    // Radio-Buttons finden und Event-Listener hinzufügen
    const radioButtons = this.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', (event) => {
        this._value = parseInt(event.target.value);
        this.enableNextButton();
        
        // Event auslösen, um das Questionnaire über die Änderung zu informieren
        this.dispatchEvent(new CustomEvent('question-answered', {
          bubbles: true,
          composed: true,
          detail: {
            questionNumber: this._questionNumber,
            value: this._value
          }
        }));
      });
    });
    
    // "Weiter"-Button finden und Event-Listener hinzufügen
    const nextButton = this.querySelector('button');
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        if (this._isLastQuestion) {
          this.dispatchEvent(new CustomEvent('evaluate', {
            bubbles: true,
            composed: true
          }));
        } else {
          this.dispatchEvent(new CustomEvent('navigate-next', {
            bubbles: true,
            composed: true,
            detail: { questionNumber: this._questionNumber }
          }));
        }
      });
    }
    
    // "Zurück"-Link finden und Event-Listener hinzufügen, falls nicht die erste Frage
    if (!this._isFirstQuestion) {
      const backLink = this.querySelector('.back-link');
      if (backLink) {
        backLink.addEventListener('click', (event) => {
          event.preventDefault();
          this.dispatchEvent(new CustomEvent('navigate-prev', {
            bubbles: true,
            composed: true,
            detail: { questionNumber: this._questionNumber }
          }));
        });
      }
    } else {
      // Bei der ersten Frage den Zurück-Link ausblenden
      const backLink = this.querySelector('.back-link');
      if (backLink) {
        backLink.classList.add('hidden');
      }
    }
    
    // Zustand von bereits ausgewählten Radio-Buttons wiederherstellen
    this.restoreState();
  }
  
  // Aktiviert den "Weiter"-Button
  enableNextButton() {
    const button = this.querySelector('button');
    if (button) {
      button.disabled = false;
    }
  }
  
  // Liest den aktuellen Zustand aus dem UI und stellt ihn wieder her
  restoreState() {
    const selectedRadio = this.querySelector('input[type="radio"]:checked');
    if (selectedRadio) {
      this._value = parseInt(selectedRadio.value);
      this.enableNextButton();
    }
  }
  
  // Getter und Setter für den Wert
  get value() {
    return this._value;
  }
  
  set value(newValue) {
    this._value = newValue;
    // UI aktualisieren
    const radio = this.querySelector(`input[value="${newValue}"]`);
    if (radio) {
      radio.checked = true;
      this.enableNextButton();
    }
  }
  
  // Hilfsmethode um zu prüfen, ob diese Frage die letzte ist
  get isLastQuestion() {
    return this._isLastQuestion;
  }
}

/**
 * AsrsQuestionnaire - Custom Element für den gesamten Fragebogen
 * Wrappt das komplette Formular und koordiniert die einzelnen Fragen.
 */
class AsrsQuestionnaire extends HTMLElement {
  constructor() {
    super();
    this._currentQuestion = 1;
    this._questions = [];
    this._scores = [];
  }
  
  connectedCallback() {
    // Alle Fragen-Elemente finden und initialisieren
    this._questions = Array.from(this.querySelectorAll('asrs-question'));
    
    // Attribute für erste und letzte Frage setzen
    if (this._questions.length > 0) {
      this._questions[0].setAttribute('first-question', '');
      this._questions[this._questions.length - 1].setAttribute('last-question', '');
    }
    
    // Scores-Array initialisieren
    this._scores = new Array(this._questions.length).fill(null);
    
    // Event-Listener registrieren
    this.addEventListener('question-answered', this.handleQuestionAnswered.bind(this));
    this.addEventListener('navigate-next', this.handleNavigateNext.bind(this));
    this.addEventListener('navigate-prev', this.handleNavigatePrev.bind(this));
    this.addEventListener('evaluate', this.evaluateASRS.bind(this));
    
    // Erste Frage aktivieren
    this.showQuestion(1);
    
    // Bestehenden Zustand wiederherstellen, falls vorhanden
    this.restoreState();
  }
  
  // Verarbeitet eine beantwortete Frage
  handleQuestionAnswered(event) {
    const { questionNumber, value } = event.detail;
    this._scores[questionNumber - 1] = value;
  }
  
  // Wechselt zur nächsten Frage
  handleNavigateNext(event) {
    const { questionNumber } = event.detail;
    this.showQuestion(questionNumber + 1);
  }
  
  // Wechselt zur vorherigen Frage
  handleNavigatePrev(event) {
    const { questionNumber } = event.detail;
    if (questionNumber > 1) {
      this.showQuestion(questionNumber - 1);
    }
  }
  
  // Zeigt eine spezifische Frage an und blendet alle anderen aus
  showQuestion(questionNumber) {
    // Alle Fragen ausblenden
    this._questions.forEach(question => {
      question.classList.remove('active');
    });
    
    // Gesuchte Frage finden und anzeigen
    const questionToShow = this._questions.find(q => 
      parseInt(q.getAttribute('question-number')) === questionNumber
    );
    
    if (questionToShow) {
      questionToShow.classList.add('active');
      this._currentQuestion = questionNumber;
      
      // Fokus auf die Frage für Accessibility
      setTimeout(() => {
        const questionLabel = questionToShow.querySelector('label');
        if (questionLabel) questionLabel.focus();
      }, 100);
    }
  }
  
  // Speichert den aktuellen Zustand der Radio-Buttons
  restoreState() {
    this._questions.forEach(question => {
      const questionNumber = parseInt(question.getAttribute('question-number'));
      const selectedRadio = question.querySelector('input[type="radio"]:checked');
      
      if (selectedRadio) {
        const value = parseInt(selectedRadio.value);
        this._scores[questionNumber - 1] = value;
        
        // Weiter-Button aktivieren
        const nextButton = question.querySelector('button');
        if (nextButton) nextButton.disabled = false;
      }
    });
  }
  
  // Wertet den Fragebogen aus
  evaluateASRS() {
    let totalScore = 0;
    
    // Fragen 1 bis 3: Punkt, wenn Manchmal (2), Oft (3) oder Sehr oft (4) ausgewählt ist
    for (let i = 0; i < 3; i++) {
      if (this._scores[i] >= 2) {
        totalScore++;
      }
    }
    
    // Fragen 4 bis 6: Punkt, wenn Oft (3) oder Sehr oft (4) ausgewählt ist
    for (let i = 3; i < 6; i++) {
      if (this._scores[i] >= 3) {
        totalScore++;
      }
    }
    
    // Ergebnis anzeigen
    this.displayResult(totalScore);
  }
  
  // Zeigt das Ergebnis an
  displayResult(totalScore) {
    const resultDiv = document.getElementById('result');
    if (!resultDiv) {
      console.error('Ergebnis-Element nicht gefunden');
      return;
    }
    
    let resultMessage;
    let resultClass;
    
    if (totalScore >= 4) {
      resultMessage = "Das Screening ist auffällig. Bei Leidensdruck wird empfohlen, einen Facharzt oder Therapeuten zu konsultieren. Einen tiefergehenden Test finden Sie <a href='https://www.adxs.org/de/test/symptom-v5' target='_blank'>hier</a> zur Erhöhung der Aussagekraft.";
      resultClass = "auffaellig";
    } else {
      resultMessage = "Das Screening ist unauffällig. Wenn dennoch Unsicherheiten bestehen, kann ein Fachgespräch hilfreich sein.";
      resultClass = "unauffaellig";
    }
    
    resultDiv.innerHTML = resultMessage;
    resultDiv.className = `result ${resultClass}`;
    resultDiv.style.display = 'block';
    
    // Zum Ergebnis scrollen
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Fokus auf Ergebnis setzen für Accessibility
    resultDiv.setAttribute('tabindex', '-1');
    resultDiv.focus();
    
    // Event auslösen, das die Auswertung abgeschlossen ist
    this.dispatchEvent(new CustomEvent('questionnaire-completed', {
      bubbles: true,
      detail: { score: totalScore }
    }));
  }
}

// Custom Elements registrieren
customElements.define('asrs-question', AsrsQuestion);
customElements.define('asrs-questionnaire', AsrsQuestionnaire);

// Warte auf DOMContentLoaded, um sicherzustellen, dass alle Elemente geladen sind
document.addEventListener('DOMContentLoaded', () => {
  console.log('ASRS Fragebogen initialisiert');
});