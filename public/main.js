$( document ).ready(function() {
    console.log("dom loaded");
    
  $("#catBtn").on("click", function() {
    var category = $('#Category')[0].value;
    let table = document.getElementsByClassName("checkCat");
    console.log(table.length);
    for(let i = 0; i < table.length; i++) {
        let currentRow =  $(table)[i];
        if(category == "None") {
            $(currentRow).removeClass("hide");
        }
        else if(category == $(table)[i].id) {
            $(currentRow).removeClass("hide");
        }
        else if( (table)[i].id !== category) {   
            console.log(currentRow);
            $(currentRow).addClass("hide")    
        }     
    }   
  }) 
  });
