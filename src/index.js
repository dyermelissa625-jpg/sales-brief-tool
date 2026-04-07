function validateUrl(input){
	if (!input){
		return {valid: false, error: "No URL provided"};
	}
	if (input.length > 2000) {
	return { valid: false, error: "URL too long" };
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

function buildContext(extracted, url){
	const parts =[];
	parts.push(`Company URL: ${url}`);
	if (extracted.title){
		parts.push(`Page title: ${extracted.title}`);
	}
	const description = extracted.ogDescription || extracted.description;
	if(description){
		parts.push(`Company description: ${description}`);
	}
	if (extracted.headings?.length > 0){
		const nonDuplicateHeadings = [...new Set(extracted.headings)].slice(0, 8);
		parts.push(`Page headings: ${nonDuplicateHeadings.join(" | ")}`);
	}
	if (extracted.jsonLd?.description) {
    parts.push(`Structured data: ${extracted.jsonLd.description}`);
    }
	const result = parts.join("\n");
	return result.replace(/\s+/g, " ").trim().slice(0, 3000)
}

async function generateBrief(context, env) {
  const response = await env.AI.run(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        {
          role: "system",
          content: "You are an expert B2B sales researcher. Generate a concise sales brief based on the provided company information."
        },
        {
          role: "user",
          content: `Generate a sales brief for this company:\n\n${context}`
        }
      ]
    }
  );

  return response.response;
}


export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const companyUrl = url.searchParams.get("url");
        const validation = validateUrl(companyUrl);
        if (!validation.valid) {
           return new Response(JSON.stringify({ error: validation.error}),{ status:400, headers:{"Content-Type": "application/json" }}); 
        }
		const targetUrl = validation.url.href;
        let pageResponse;
		try{
			pageResponse = await fetchWithTimeout(targetUrl);
		}catch{
			return new Response(JSON.stringify({status: 502}));
		}

		const pageContent = await extractPageContent(pageResponse);
		//return new Response(JSON.stringify(pageContent), {status: 200,headers: { "Content-Type": "application/json" }});
		const cleanContext = buildContext(pageContent, targetUrl);
		//return new Response(JSON.stringify(cleanContext), {status: 200,headers: { "Content-Type": "application/json" }})
		const brief = await generateBrief(cleanContext, env);
		return new Response(JSON.stringify({ brief }), {status: 200, headers: { "Content-Type": "application/json" }});
	}
};