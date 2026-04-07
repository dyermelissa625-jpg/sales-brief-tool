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

async function extractPageContent(response){
	const data = {
		title: "",
		description: "",
		ogTitle: "",
		ogDescription: "",
		headings: [],
		jsonLd: null
    };
	  const rewriter = new HTMLRewriter()
    .on("title", {
      text(chunk) {
        data.title += chunk.text;
      }
    })
    .on("meta[name='description']", {
      element(el) {
        data.description = el.getAttribute("content") || "";
      }
    })
    .on("meta[property='og:description']", {
      element(el) {
        data.ogDescription = el.getAttribute("content") || "";
      }
    })
    .on("h1, h2", {
      text(chunk) {
        if (chunk.text.trim()) {
          data.headings.push(chunk.text.trim());
        }
      }
    })
    .on("script[type='application/ld+json']", {
      text(chunk) {
        data.jsonLd = (data.jsonLd || "") + chunk.text;
      }
    });

  await rewriter.transform(response).text();

  if (data.jsonLd) {
    try {
      data.jsonLd = JSON.parse(data.jsonLd);
    } catch {
      data.jsonLd = null; 
    }
  }

  return data;
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

		const pageConstant = await extractPageContent(pageResponse);
		return new Response(JSON.stringify(pageConstant), {status: 200,headers: { "Content-Type": "application/json" }});

    }
};