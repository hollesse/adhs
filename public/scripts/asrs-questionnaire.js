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
      // Prüfen, ob es sich um die letzte Frage handelt, entweder durch das Attribut oder die ID
      const isLastQuestion = this.hasAttribute('last-question') || this.id === 'question-6';
      
      // Debug-Ausgabe
      console.log(`Initialisiere Button für Frage ${this._questionNumber}, isLastQuestion: ${isLastQuestion}`);
      
      // Event-Listener anpassen
      nextButton.addEventListener('click', () => {
        if (isLastQuestion) {
          console.log('Letzte Frage: Starte Auswertung');
          this.dispatchEvent(new CustomEvent('evaluate', {
            bubbles: true,
            composed: true
          }));
        } else {
          console.log(`Gehe weiter zu Frage ${this._questionNumber + 1}`);
          this.dispatchEvent(new CustomEvent('navigate-next', {
            bubbles: true,
            composed: true,
            detail: { questionNumber: this._questionNumber }
          }));
        }
      });
      
      // Anzeige-Text für den Auswertungs-Button anpassen
      if (isLastQuestion) {
        nextButton.textContent = 'Auswertung anzeigen';
      }
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
    console.log('Evaluierung wird gestartet...');
    console.log('Aktuelle Scores:', this._scores);
    
    // Prüfen, ob alle Fragen beantwortet wurden
    if (this._scores.includes(null)) {
      console.warn('Nicht alle Fragen wurden beantwortet!');
      // Hier könnten wir eine Meldung für den Benutzer anzeigen,
      // aber für den Moment lassen wir die Auswertung weiterlaufen
    }
    
    let totalScore = 0;
    
    // Fragen 1 bis 3: Punkt, wenn Manchmal (2), Oft (3) oder Sehr oft (4) ausgewählt ist
    for (let i = 0; i < 3; i++) {
      console.log(`Prüfe Frage ${i+1}, Wert: ${this._scores[i]}`);
      if (this._scores[i] !== null && this._scores[i] >= 2) {
        totalScore++;
        console.log(`  -> Punkt für Frage ${i+1}`);
      }
    }
    
    // Fragen 4 bis 6: Punkt, wenn Oft (3) oder Sehr oft (4) ausgewählt ist
    for (let i = 3; i < 6; i++) {
      console.log(`Prüfe Frage ${i+1}, Wert: ${this._scores[i]}`);
      if (this._scores[i] !== null && this._scores[i] >= 3) {
        totalScore++;
        console.log(`  -> Punkt für Frage ${i+1}`);
      }
    }
    
    console.log(`Gesamtpunktzahl: ${totalScore}`);
    
    // Ergebnis anzeigen
    this.displayResult(totalScore);
  }
  
  // Zeigt das Ergebnis an
  displayResult(totalScore) {
    console.log('Ergebnis wird angezeigt, Gesamtpunktzahl:', totalScore);
    
    const resultDiv = document.getElementById('result');
    if (!resultDiv) {
      console.error('Ergebnis-Element nicht gefunden');
      // Fallback: Ergebnis als Alert anzeigen, damit der Benutzer zumindest etwas sieht
      alert(`Ergebnis: ${totalScore >= 4 ? 'Das Screening ist auffällig.' : 'Das Screening ist unauffällig.'}`);
      return;
    }
    
    console.log('Ergebnis-Element gefunden:', resultDiv);
    
    let resultMessage;
    let resultClass;
    
    if (totalScore >= 4) {
      resultMessage = "Das Screening ist auffällig. Bei Leidensdruck wird empfohlen, einen Facharzt oder Therapeuten zu konsultieren. Einen tiefergehenden Test finden Sie <a href='https://www.adxs.org/de/test/symptom-v5' target='_blank'>hier</a> zur Erhöhung der Aussagekraft.";
      resultClass = "auffaellig";
    } else {
      resultMessage = "Das Screening ist unauffällig. Wenn dennoch Unsicherheiten bestehen, kann ein Fachgespräch hilfreich sein.";
      resultClass = "unauffaellig";
    }
    
    // Ergebnis-DIV aktualisieren
    resultDiv.innerHTML = resultMessage;
    resultDiv.className = `result ${resultClass}`;
    resultDiv.style.display = 'block';
    
    console.log('Ergebnis wurde in HTML eingefügt');
    
    // Zum Ergebnis scrollen
    try {
      resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      console.log('Zu Ergebnis gescrollt');
    } catch (e) {
      console.error('Fehler beim Scrollen zum Ergebnis:', e);
    }
    
    // Fokus auf Ergebnis setzen für Accessibility
    try {
      resultDiv.setAttribute('tabindex', '-1');
      resultDiv.focus();
      console.log('Fokus auf Ergebnis gesetzt');
    } catch (e) {
      console.error('Fehler beim Setzen des Fokus:', e);
    }
    
    // Event auslösen, das die Auswertung abgeschlossen ist
    this.dispatchEvent(new CustomEvent('questionnaire-completed', {
      bubbles: true,
      detail: { score: totalScore }
    }));
    
    console.log('Ergebnis-Anzeige abgeschlossen');
  }
}

// Custom Elements registrieren
customElements.define('asrs-question', AsrsQuestion);
customElements.define('asrs-questionnaire', AsrsQuestionnaire);

// Warte auf DOMContentLoaded, um sicherzustellen, dass alle Elemente geladen sind
document.addEventListener('DOMContentLoaded', () => {
  console.log('ASRS Fragebogen wird initialisiert...');
  
  // Stellen wir sicher, dass die Custom Elements korrekt initialisiert werden
  const questionnaire = document.querySelector('asrs-questionnaire');
  if (!questionnaire) {
    console.error('Fragebogen-Element nicht gefunden!');
    return;
  }

  // Manuelles Aufrufen der Initialisierung für den Fragebogen, um sicherzustellen, dass alles korrekt geladen wird
  setTimeout(() => {
    console.log('Fragebogen-Element gefunden, initialisiere...');
    // Prüfen, ob alle Fragen korrekt initialisiert wurden
    const questions = Array.from(document.querySelectorAll('asrs-question'));
    console.log(`${questions.length} Fragen gefunden`);
    
    // Stelle sicher, dass die letzte Frage das last-question Attribut hat
    const lastQuestion = questions[questions.length - 1];
    if (lastQuestion && !lastQuestion.hasAttribute('last-question')) {
      console.log('Setze last-question Attribut auf letzte Frage');
      lastQuestion.setAttribute('last-question', '');
    }
    
    console.log('ASRS Fragebogen wurde vollständig initialisiert');
  }, 100);
});