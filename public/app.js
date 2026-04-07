const urlInput = document.getElementById("urlInput");
const productInput = document.getElementById("productInput");
const generateBtn = document.getElementById("generateBtn");
const errorMsg = document.getElementById("errorMsg");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const briefOutput = document.getElementById("briefOutput");
const briefContent = document.getElementById("briefContent");
const companyName = document.getElementById("companyName");

function showState(state){
  emptyState.classList.add("hidden");
  loadingState.classList.add("hidden");
  briefOutput.classList.add("hidden");
  switch (state){
    case ("empty"):
       emptyState.classList.remove("hidden"); 
       break;
    case ("loading"):
       loadingState.classList.remove("hidden");
        break;
    case("brief"):
       briefOutput.classList.remove("hidden"); 
       break;
  }
  
};

generateBtn.addEventListener("click",async()=>{
    const url = urlInput.value.trim();
    const product = productInput.value.trim();
    errorMsg.textContent = "";
    if (!url){
        errorMsg.textContent= "Please enter a company URL.";
        return;
    };
    if (!product){
        errorMsg.textContent= "Please describe your product.";
        return;
    }
    showState("loading");
    try{
       const response = await fetch(`https://sales-brief-tool.dyer-melissa625.workers.dev/?url=${encodeURIComponent(url)}&product=${encodeURIComponent(product)}`);
       const data = await response.json(); 
       if (data.error){
        errorMsg.textContent = data.error;
        showState("empty");
        return
       };
       companyName.textContent= new URL(url).hostname;
       briefContent.textContent = data.brief;
       showState("brief");
    }catch{
        errorMsg.textContent = 'Something went wrong. Please try again';
        showState("empty");
    }
});