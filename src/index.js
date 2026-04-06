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

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const companyUrl = url.searchParams.get("url");

        const validation = validateUrl(companyUrl);
        if (!validation.valid) {
           return new Response(JSON.stringify({ error: validation.error }),{ status:400, headers:{"Content-Type": "application/json" }}); 
        }

        return new Response(JSON.stringify({message: "Valid URL"}),{ status:200, headers:{"Content-Type": "application/json"}}); 
    }
};