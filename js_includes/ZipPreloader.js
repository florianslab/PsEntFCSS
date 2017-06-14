// List of changes
//  06-14-2017
//    - Added support of multiple zip files
//    - Added better support for images
//    - Added MutationObserver for browsers that support it

var __resourcesUnzipped__ = false;

$(document).ready(function() {

    // This object will contain the list of audio files to preload
    var resourcesRepository = {};
    var numberUnzippedFiles = 0;

    var getZipFile = function(zipfilename){
      var zip = new JSZip();
      var errors = "";
    
      JSZipUtils.getBinaryContent(zipfilename, function(error, data) {
        if(error) {
            errors += error;
            throw error;
        }
        // Loading the zip object with the data stream
        zip.loadAsync(data).then(function() {
          console.log("Download of "+zipfilename+" complete");
            var totalLength = Object.keys(zip.files).length;
            var currentLength = 0;
            // Going through each zip file
            zip.forEach(function(path, file){
                // Unzipping the file, and counting how far we got
                file.async('arraybuffer').then(function(content){
                    currentLength++;
                    if (currentLength >= totalLength) {
                      numberUnzippedFiles++;
                      if (numberUnzippedFiles == zipFiles.length)
                        __resourcesUnzipped__ = true;
                    }
                    var blob;
                    if (path.match(/\.wav$/)) 
                      blob = new Blob([content], {'type': 'audio/wav'});
                    else if (path.match(/\.mp3$/))
                      blob = new Blob([content], {'type': 'audio/mpeg'});
                    else if (path.match(/\.ogg$/))
                      blob = new Blob([content], {'type': 'audio/ogg'});
                    else if (path.match(/\.png$/))
                      blob = new Blob([content], {'type': 'image/png'});
                    else if (path.match(/\.jpe?g$/))
                      blob = new Blob([content], {'type': 'image/jpeg'});
                    else if (path.match(/\.gif$/))
                      blob = new Blob([content], {'type': 'image/gif'});
                    else return;
                    var src = URL.createObjectURL(blob);
                    resourcesRepository[path] = src;    
                });
            });
        });
      });
    };
    
    assert(Array.isArray(zipFiles), "zipFiles should be an array of URLs");
    $.each(zipFiles, function(i, zipFile) {
        assert(typeof zipFile == "string", "zipFiles variable is either undefined or ill-defined ("+typeof zipFiles+")");
        assert(zipFile.match(/^https?:\/\/.+\.zip$/) != null, "Bad format for the URL provided as zipFiles ("+zipFile+")");
        getZipFile(zipFile);
    });


    // Using a 7ms delay should be enough, 
    // seem to remember that Alex said there was a 14ms refresh rate in Ibex (or something like that)
    (function() {

        // Returns the URL of the filename if it is in resourcesRepository, null otherwise
        var inRep = function(filename) {
          // Using window.location to retrieve the local path added in "url()" by jQuery.css before bare filenames
          var loc = window.location.toString(), localHost = loc.toString().substring(0, loc.lastIndexOf('/'))+"/";
          if (typeof resourcesRepository[filename] != "undefined")
            return resourcesRepository[filename];
          if (typeof resourcesRepository[filename.replace(localHost,"")] != "undefined")
            return resourcesRepository[filename.replace(localHost,"")];
          return null;
        };

        // CSS properties which may contain an image.
        var hasImgProperties = ['backgroundImage','listStyleImage','borderImage','borderCornerImage','cursor'];
        // Element attributes which may contain an image.
        var hasImageAttributes = ['srcset'];
        // To match `url()` references.
        // Spec: http://www.w3.org/TR/CSS2/syndata.html#value-def-uri
        var matchUrl = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
        // checkImages is to be called on a jQuery object
        var checkImages = function(element) {

          // If an `img` element, treat it. But keep iterating in
          // case it has a background image too.
          if (element.is('img[src][src!=""]') &&
              !element.is('[srcset]')) {
              var src = element.attr('src');
              // Replace attr if it matches
              if (inRep(src))
                element.attr("src", inRep(src));
          }
          // If CSS property, replace it
          $.each(hasImgProperties, function (i, property) {
              var propertyValue = element.css(property);
              var match;
              // If it doesn't contain this property, skip.
              if (!propertyValue) {
                  return true;
              }
              // Get all url() of this element.
              while (match = matchUrl.exec(propertyValue)) {
                // If the filename matches
                if (inRep(match[2]))
                  element.css(property, "url('"+inRep(match[2])+"')");
              }
          });
          // If attribute, replace it
          $.each(hasImageAttributes, function (i, attribute) {
              var attributeValue = element.attr(attribute);
              var attributeValues;
              // If it doesn't contain this property, skip.
              if (!attributeValue) {
                  return true;
              }
              var src = element.attr('src'), srcset = element.attr('srcset');
              if (inRep(src))
                element.attr("src", inRep(src));
              if (inRep(srcset))
                element.attr("srcset", inRep(srcset));
          });
        };

        var updatePotentialFilenames = function () {
          // Replacing all audios and images with a blob URL
          $("audio").each(function() {
            var t = this;
            var replaced = false;
            $(t).find("source").each(function(){
              var src = $(this).attr("src");
              if (inRep(src)) {
                var source = $("<source>");
                source.attr({type: $(this).attr("type"), src: inRep(src)});
                $(this).replaceWith(source);
                replaced = true;
              }
              if (replaced) t.load();
            });
          });
          // Check images
          $("#bod").find("*").each(function() {
            checkImages($(this));
          });
        };

        // MutationObserver avoids overloading the browser: only triggered when update in DOM
        if (typeof MutationObserver != "undefined") {
          // select the target node
          var target = document.querySelector('#bod');
          // create an observer instance
          var observer = new MutationObserver(updatePotentialFilenames);
          // configuration of the observer:
          var config = { attributes: true, childList: true, characterData: true, subtree: true };
          // pass in the target node, as well as the observer options
          observer.observe(target, config);
        }
        // If no MutationObserver, check every 7 milliseconds (might result in overloading)
        else {
          var ivl = setInterval(updatePotentialFilenames, 7);
        }
        
    }) ();

});

define_ibex_controller({
  name: "ZipPreloader",

  jqueryWidget: {    
    _init: function () {

        var humanTime = function(milliseconds) {
          var date = new Date(milliseconds);
          var str = '';
          if (date.getUTCDate() > 1) str += date.getUTCDate()-1 + " days, ";
          if (date.getUTCHours() > 0) str += date.getUTCHours() + " hours, ";
          if (date.getUTCMinutes() > 0) str += date.getUTCMinutes() + " minutes, ";
          if (date.getUTCSeconds() > 0) str += date.getUTCSeconds() + " seconds, ";
          if (date.getUTCMilliseconds() > 0) str += date.getUTCMilliseconds() + " milliseconds";
          str = str.replace(/, $/,"");
          str = str.replace(/(^|[^1-9])([01]) (day|hour|minute|second|millisecond)s/,"$1$2 $3");
          return str;
        }

        this.cssPrefix = this.options._cssPrefix;
        this.utils = this.options._utils;
        this.finishedCallback = this.options._finishedCallback;
        
        // How long do we have to wait before giving up loading?
        this.timeout = dget(this.options, "timeout", 60000);
        // if (this.alternateHost) this.timeout = this.timeout / 2; // If we were to implement another loading with the alternate host
        // Whether failure to load should be reported in the results file
        this.report = dget(this.options, "report", true);

        this.errorMessage = dget(this.options, "errorMessage", "<p>Sorry, we were unable to load the resources.</p>"+
                                                               "<p>If the problem persists, try to contact the experimenters."+
                                                               " Thank you.</p>");

        this.html = dget(this.options, "html", "<p>Please wait, resources are loading.</p>"+
                                               "<p>This process might take up to "+humanTime(this.timeout)+".</p>");

        this.element.addClass(this.cssPrefix + "preloader");
        this.element.append($("<div id='content'>").append(htmlCodeToDOM(this.html)));
       
        var t = this;
       
        // Clearing any prior timeout and interval
        clearInterval(t.timer);
        clearInterval(t.checkLoaded);
        
        // Launching the interval to check for all files being loaded
        t.checkLoaded = setInterval(function() {
            if (__resourcesUnzipped__) {
                // If all files have been loaded, stop the interval
                clearInterval(t.checkLoaded);
                // If there was a timeout, also clear it
                if (typeof t.timeout == "number") clearTimeout(t.timer);
                // Pass to the next element in the thread
                t.finishedCallback(null);
            }}, 10);
        
        // If a timeout has been passed
        if (typeof t.timeout == "number")
          // Launch the timeout
          t.timer = setTimeout(function () {
                // We won't try to load anymore
                clearInterval(t.checkLoaded);
                $("#content").html("<div id='errorSorryMessage'>"+t.errorMessage+"</div>"+
                                   "<div id='errorMessages'>"+errors+"</div>");
            }, t.timeout);
    }
  },

  properties: {
    obligatory: null,
    countsForProgressBar: false,
    htmlDescription: function (opts) {
        return truncateHTML(htmlCodeToDOM(opts.html), 100);
    }
  }
});