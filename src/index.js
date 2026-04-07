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

async function generateBrief(context, env, product) {
  const response = await env.AI.run(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        {
          role: "system",
          content: `You are an expert B2B sales researcher. Your job is to generate a detailed and structured sales brief that helps a salesperson prepare for a client call or outreach.
					The salesperson sells the following product: ${product}.
					Using the company information provided, generate a brief with exactly these sections in this order:
					1. Company Overview Name, industry, what they do, and what products or services they sell. If any information is missing, write "Research needed."
					2. Business Background: A short history of the company and any notable milestones. If unknown, write "Research needed."
					For each section, be thorough and specific to this company. Generic observations are not useful — tie every point back to what you know about this specific company.
					3. Client Potential Rate their potential as a client on this scale: Very Low / Low/ Medium / High / Very High. Explain your reasoning in 2-3 sentences.
					4. Recommended Solutions Based on what the salesperson sells, suggest which of their products or services would be most relevant to this company and why. Rank the products in order of the most recommended to least.
					5. Email Pitch A professional but conversational cold email between 200-400 words pitching the most relevant products. Include a subject line. 
					6. Call Script A natural phone call script between 100-250 words. Format it as a real conversation with labels like "You:" and "Prospect:" showing likely responses and objections. Include an opening, a value proposition, handling one likely objection, and a close asking for a meeting.
					Keep the tone professional but human. Use human style writing, no bold text, em-dashes or overly AI sounding language. Do not use any markdown formatting, asterisks, bullet points, or bold text. Use plain numbered lists and plain text only. You must respond in plain text only. Never use asterisks, never use markdown, never use bold or italic formatting of any kind. If you use any asterisks or markdown formatting, your response is invalid.Be concise and actionable. Do not invent specific facts, if information is unavailable, say so honestly. `
		},
        {
          role: "user",
          content: `Generate a sales brief for this company:\n\n${context}`
        }
      ],
	  max_tokens: 2048
    }
  );

  return response.response;
}


export default {
    async fetch(request, env, ctx) {
		if (request.method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST",
				"Access-Control-Allow-Headers": "Content-Type"
			}
		});
}
        const url = new URL(request.url);
        const companyUrl = url.searchParams.get("url");
        const validation = validateUrl(companyUrl);
        if (!validation.valid) {
           return new Response(JSON.stringify({ error: validation.error}),{ status:400, headers:{"Content-Type": "application/json","Access-Control-Allow-Origin": "*" }}); 
        }
		const targetUrl = validation.url.href;
		const ourProduct = url.searchParams.get("product")
		if (!ourProduct) {
    		return new Response(JSON.stringify({ error: "No product description provided" }), {status: 400,
        headers: { "Content-Type": "application/json","Access-Control-Allow-Origin": "*" }});
		}
        let pageResponse;
		try{
			pageResponse = await fetchWithTimeout(targetUrl);
		}catch{
			return new Response(JSON.stringify({status: 502}), {status: 502, headers:{"Content-Type": "application/json","Access-Control-Allow-Origin": "*"}});
		}

		const pageContent = await extractPageContent(pageResponse);
		//return new Response(JSON.stringify(pageContent), {status: 200,headers: { "Content-Type": "application/json" }});
		const cleanContext = buildContext(pageContent, targetUrl);
		//return new Response(JSON.stringify(cleanContext), {status: 200,headers: { "Content-Type": "application/json" }})
		const brief = await generateBrief(cleanContext, env, ourProduct);
		return new Response(JSON.stringify({ brief }), {status: 200, headers: { "Content-Type": "application/json","Access-Control-Allow-Origin": "*" }});
	}
};