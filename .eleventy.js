module.exports = function(eleventyConfig) {
  // Passthrough file copies
  eleventyConfig.addPassthroughCopy("src/assets");
  
  // Watch CSS files for changes
  eleventyConfig.addWatchTarget("src/assets/**/*");
  
  // Base config
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    templateFormats: ["html", "liquid", "md"],
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid",
    passthroughFileCopy: true
  };
};