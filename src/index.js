function validateUrl(input){
	if (!input){
		return {valid: false, error: "No URL provided"};
	}
	try{
		const url = new URL(input);
		if (!["http:","https:"].includes(url.protocol)){
			return { valid: false, error: "URL must use http or https" };
		}
		return {valid: true, url}
	} catch{
		return {valid: false, error: "Invalid URL Format"};
	}
	
}

async function fetchWithTimeout(url, timeoutMS=5000){
	const controller = new AbortController(); 
	const timer = setTimeout(()=> controller.abort(), timeoutMS)
	try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {"User-Agent": "Mozilla/5.0 (compatible; SalesBriefBot/1.0)"}
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
	}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const companyUrl = url.searchParams.get("url");

        const validation = validateUrl(companyUrl);
        if (!validation.valid) {
           return new Response(JSON.stringify({ error: validation.error}),{ status:400, headers:{"Content-Type": "application/json" }}); 
        }

        let pageResponse;
		try{
			pageResponse = await fetchWithTimeout(validation.url.href);
		}catch{
			return new Response(JSON.stringify({status: 502}));
		}
		return new Response(JSON.stringify({ message: "Page fetched successfully"}), {status: pageResponse.status,headers:{"Content-Type": "application/json" } });
    }
};