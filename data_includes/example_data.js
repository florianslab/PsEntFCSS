var Parameters = {}, 
    URLParameters = window.location.search.replace("?", "").split("&");

for (parameter in URLParameters) Parameters[URLParameters[parameter].split("=")[0]] = URLParameters[parameter].split("=")[1];

var triggers;

var shuffleSequence = seq("Instructions", startsWith("Practice"), "AfterPractice", 
                          // This rshuffle is really random (not trying to get even distributions)
                          rshuffle(startsWith("PsEnt")),
                          "PostExp");
var practiceItemTypes = ["PracticePracticeTrue","PracticePracticeFalse"];

var showProgressBar = false;

var defaults = [
    "DynamicQuestion",
    {
        clickableAnswers: false,
        enabled: false
    }
];

var contextFilename = "NewContextSentences.zip",
    testsoundFilename = "NewTestSound.zip";
if (Parameters.Ctxt == "FCA"){
  contextFilename = "OldContextSentences.zip";
  testsoundFilename = "OldTestSound.zip";
}

var data = dataReturn;
if (Parameters.Trig == "St") data = dataStop;

var zipFiles = {testsound: "http://files.lab.florianschwarz.net/ibexfiles/PsEntFCSS/"+testsoundFilename,
                images: "http://files.lab.florianschwarz.net/ibexfiles/ImagesPNG.zip", 
                testsentences: "http://files.lab.florianschwarz.net/ibexfiles/PsEntFCSS/TestSentences.zip",
                contextsentences: "http://files.lab.florianschwarz.net/ibexfiles/PsEntFCSS/"+contextFilename};

var items = [

    ["Instructions", "__SetCounter__", { }],
    
    ["Instructions", "Form", {html: {include: "ProlificConsentForm.html"}, continueOnReturn: true}],

    ["Instructions", "ZipPreloader", {only: ["testsound"]}],

    ["Instructions", "Message", {html: {include: "warning.html"}}],

    ["Instructions", "Message", {html: {include: "instructions.html"}}],

    ["Instructions", "ZipPreloader", {}],
    
    ["AfterPractice", "Message", {html: "Very well, now let's proceed to the actual experiment."}],

    ["PostExp", "Form", {
        html: {include: "ProlificFeedbackPreConfirmation.html"}
    }],
    
    ["PostExp", "__SendResults__", {
       manualSendResults: true,
       sendingResultsMessage: "Please wait while your answers are being saved.",
       completionMessage: "Your answers have successfully being saved!"
    }],
    
    ["PostExp", "Message", {
        transfer: null,
        html: {include: "ProlificConfirmation.html"}
    }]

    ].concat(GetItemsFrom(data, null, {
      ItemGroup: ["item", "group"],
      Elements: [
          function(x){return x.Expt+x.Condition;},          // Name of the item: 'Condition' column
          "DynamicQuestion",
          {
              legend: function(x){ return [x.Condition,x.item,x.group,x.Test_Sentence].join("+"); },
              answers: function(x){ 
                  var female_target = {person:x.female_target_filename, monday: x.ftarget_M, tuesday: x.ftarget_T, wednesday: x.ftarget_W},
                      female_filler = {person:x.female_filler_filename, monday: x.ffiller_M, tuesday: x.ffiller_T, wednesday: x.ffiller_W},
                      male_target = {person:x.male_target_filename, monday: x.mtarget_M, tuesday: x.mtarget_T, wednesday: x.mtarget_W},
                      male_filler = {person:x.male_filler_filename, monday: x.mfiller_M, tuesday: x.mfiller_T, wednesday: x.mfiller_W},
                      female_target_covered = {person:x.female_target_filename, monday: "CoveredBox.png", tuesday: "CoveredBox.png", wednesday: "CoveredBox.png"},
                      female_filler_covered = {person:x.female_filler_filename, monday: "CoveredBox.png", tuesday: "CoveredBox.png", wednesday: "CoveredBox.png"},
                      male_target_covered = {person:x.male_target_filename, monday: "CoveredBox.png", tuesday: "CoveredBox.png", wednesday: "CoveredBox.png"},
                      male_filler_covered = {person:x.male_filler_filename, monday: "CoveredBox.png", tuesday: "CoveredBox.png", wednesday: "CoveredBox.png"},
                      visible, covered;
                   
                  switch (x.TargetPosition) {
                          case "top":
                              if (x.FemaleRows == "top") {
                                  visible = [female_target, female_filler, male_target, male_filler];
                                  covered = [female_target_covered, female_filler_covered, male_target_covered, male_filler_covered];  
                              }
                              else {
                                  visible = [male_target, male_filler, female_target, female_filler];
                                  covered = [male_target_covered, male_filler_covered, female_target_covered, female_filler_covered];     
                              }
                              break;
                          case "bottom":
                              if (x.FemaleRows == "top") {
                                  visible = [female_filler, female_target, male_filler, male_target];
                                  covered = [female_filler_covered, female_target_covered, male_filler_covered, male_target_covered]; 
                              }
                              else {
                                  visible = [male_filler, male_target, female_filler, female_target];
                                  covered = [male_filler_covered, male_target_covered, female_filler_covered, female_target_covered];
                              }
                  }
                   
                  return { Visible: ["F", newCalendar(visible, 3, "visible", true)], Covered: ["J", newCalendar(covered, 3, "covered", true)] };
              },
              sequence: function(x){ return [
                  // DEBUG INFORMATION
                  // "Condition: "+x.Condition+"; Item: "+x.item+"; Group: "+x.group,
                  {pause: 150},
                  //x.Context_Sentence,
                  {this: "answers", showKeys: "top"},
                  {audio: x.context_sound_filename, waitFor:true, type: "audio/mpeg"},
                  {pause: 150, newRT: true},
                  //x.Test_Sentence,
                  {audio: x.test_sound_filename, type: "audio/mpeg"},
                  function(t){ 
                      $("#visiblehideWednesday, #coveredhideWednesday").css("display", "none");
                      t.enabled=true;
                  }
              ];}
          }
      ]
  }));