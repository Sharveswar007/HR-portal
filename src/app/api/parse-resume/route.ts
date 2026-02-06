import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// OCR using OCR.space API
async function extractTextWithOCR(file: File): Promise<string> {
  const OCR_API_KEY = process.env.OCR_SPACE_API_KEY;
  
  if (!OCR_API_KEY) {
    console.warn("[Resume Parser] OCR service not configured. Set OCR_SPACE_API_KEY in environment.");
    return "";
  }

  // Try with both OCR engines - Engine 2 is more accurate, Engine 1 is faster
  const engines = ["2", "1"];
  let lastError: Error | null = null;

  for (const engine of engines) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("apikey", OCR_API_KEY);
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "false");
        formData.append("detectOrientation", "true");
        formData.append("scale", "true");
        formData.append("OCREngine", engine);
        
        // For PDFs, enable multi-page processing
        if (file.type === "application/pdf") {
          formData.append("isCreateSearchablePdf", "false");
          formData.append("filetype", "PDF");
        }

        console.log(`[OCR] Attempt ${attempt + 1} with Engine ${engine}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`OCR API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.IsErroredOnProcessing) {
          const errorMsg = result.ErrorMessage?.[0] || "OCR processing failed";
          if (errorMsg.includes("E208") || errorMsg.includes("internal")) {
            console.log(`[OCR] Temporary error, retrying...`);
            lastError = new Error(errorMsg);
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
            continue;
          }
          throw new Error(errorMsg);
        }

        // Combine text from all pages
        const extractedText = result.ParsedResults
          ?.map((page: { ParsedText: string }) => page.ParsedText)
          .join("\n\n") || "";

        if (extractedText.trim().length > 20) {
          console.log(`[OCR] Success with Engine ${engine}`);
          return extractedText;
        }
        
        lastError = new Error("No text could be extracted from the document");
        break;
      } catch (error) {
        console.error(`[OCR] Error with Engine ${engine}, attempt ${attempt + 1}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (lastError.message.includes("timeout") || lastError.message.includes("aborted")) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
  }

  console.warn("[OCR] Failed after all attempts:", lastError?.message);
  return "";
}

// Parse resume text to extract detailed candidate info
function parseResumeText(text: string, fileName: string) {
  const lines = text.split("\n").filter((l) => l.trim());
  const textLower = text.toLowerCase();

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : "";

  // Extract phone - multiple formats
  const phonePatterns = [
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /(\+\d{1,3}[-.\s]?)?\d{10}/,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/,
  ];
  let phone = "";
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      phone = match[0];
      break;
    }
  }

  // Extract LinkedIn URL
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  const linkedin = linkedinMatch ? `https://www.${linkedinMatch[0]}` : "";

  // Extract GitHub URL
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  const github = githubMatch ? `https://www.${githubMatch[0]}` : "";

  // Extract portfolio/website URL
  const websiteMatch = text.match(/(?:portfolio|website|www)[:\s]*([a-zA-Z0-9.-]+\.[a-z]{2,})/i);
  const website = websiteMatch ? websiteMatch[1] : "";

  // Extract name (usually first non-empty line or near email)
  let name = "";
  for (const line of lines.slice(0, 15)) {
    const cleaned = line.trim();
    if (
      cleaned.length > 2 &&
      cleaned.length < 60 &&
      !cleaned.includes("@") &&
      !/^\d/.test(cleaned) &&
      !/^(resume|cv|curriculum|vitae|profile|summary|objective|contact|phone|email|address|linkedin|github|portfolio)/i.test(cleaned) &&
      !/^https?:\/\//.test(cleaned) &&
      !/^\+?\d/.test(cleaned) &&
      !cleaned.includes(".com") &&
      !cleaned.includes(".org")
    ) {
      // Check if it looks like a name (2-4 words, capitalized)
      const words = cleaned.split(/\s+/);
      if (words.length >= 1 && words.length <= 5) {
        const looksLikeName = words.every(w => /^[A-Z][a-z]*\.?$/.test(w) || /^[A-Z]+$/.test(w));
        if (looksLikeName || words.length <= 3) {
          name = cleaned;
          break;
        }
      }
    }
  }
  if (!name) name = fileName.replace(".pdf", "").replace(/[_-]/g, " ");

  // Extract skills with categories
  const skillCategories = {
    languages: ["JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Ruby", "Go", "Rust", "Swift", "Kotlin", "PHP", "Perl", "Scala", "R", "MATLAB", "Dart", "Lua", "Haskell", "Elixir"],
    frontend: ["React", "Angular", "Vue", "Svelte", "Next.js", "Nuxt", "Gatsby", "HTML", "CSS", "Sass", "SCSS", "Tailwind", "Bootstrap", "Material UI", "Chakra UI", "Redux", "MobX", "Zustand"],
    backend: ["Node.js", "Express", "Django", "Flask", "FastAPI", "Spring", "Rails", "Laravel", "ASP.NET", "NestJS", "GraphQL", "REST", "gRPC", "Microservices"],
    database: ["SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Cassandra", "Oracle", "SQLite", "Firebase", "Supabase", "Prisma"],
    cloud: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "CircleCI", "GitHub Actions", "Vercel", "Netlify", "Heroku"],
    mobile: ["React Native", "Flutter", "Swift", "Kotlin", "Xamarin", "Ionic", "Android", "iOS"],
    ai_ml: ["Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Keras", "scikit-learn", "NLP", "Computer Vision", "OpenAI", "LangChain", "Hugging Face"],
    tools: ["Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence", "Figma", "Sketch", "Adobe XD", "VS Code", "IntelliJ", "Postman"],
    soft_skills: ["Leadership", "Communication", "Teamwork", "Problem Solving", "Agile", "Scrum", "Project Management"],
  };

  const foundSkills: { [category: string]: string[] } = {};
  let allSkills: string[] = [];

  for (const [category, skills] of Object.entries(skillCategories)) {
    foundSkills[category] = skills.filter((skill) =>
      textLower.includes(skill.toLowerCase())
    );
    allSkills = [...allSkills, ...foundSkills[category]];
  }

  // Extract experience with details
  const expPatterns = [
    /(\d+)\+?\s*years?\s*(of)?\s*(professional\s*)?(experience|exp)/i,
    /(\d+)\+?\s*yrs?\s*(of)?\s*(experience|exp)/i,
    /(experience|exp)\s*:?\s*(\d+)\+?\s*years?/i,
  ];
  let yearsOfExperience = "Not specified";
  for (const pattern of expPatterns) {
    const match = text.match(pattern);
    if (match) {
      const years = match[1] || match[2];
      yearsOfExperience = `${years}+ years`;
      break;
    }
  }

  // Extract work history (company names and roles)
  const workHistory: { company: string; role: string; duration: string }[] = [];
  const companyPatterns = [
    /(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,-]+?)(?:\s+as|\s+-|\s+from|\n)/g,
    /([A-Z][A-Za-z0-9\s&.,-]+?)\s+(?:\||–|-)\s+([A-Za-z\s]+?)\s+(?:\||–|-)\s+(\d{4})/g,
  ];

  // Extract education details
  const eduKeywords = ["Bachelor", "Master", "PhD", "Ph.D", "B.S.", "M.S.", "B.Tech", "M.Tech", "MBA", "B.E.", "M.E.", "BSc", "MSc", "BA", "MA", "BCA", "MCA", "B.Sc", "M.Sc", "Associate", "Diploma"];
  let education: { degree: string; field: string; institution: string }[] = [];
  
  for (const keyword of eduKeywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      const eduMatch = text.match(new RegExp(`${keyword}[^.\\n]{0,150}`, "i"));
      if (eduMatch) {
        education.push({
          degree: keyword,
          field: eduMatch[0].substring(keyword.length).trim().substring(0, 100),
          institution: "",
        });
      }
    }
  }

  // Extract certifications
  const certPatterns = [
    /(?:certified|certification)[:\s]*([^.\n]{10,100})/gi,
    /(AWS|Google|Microsoft|Azure|Cisco|Oracle|PMP|Scrum|CompTIA)\s+(?:certified|certification)[:\s]*([^.\n]{5,80})/gi,
  ];
  const certifications: string[] = [];
  for (const pattern of certPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      certifications.push(match[0].trim().substring(0, 100));
    }
  }

  // Extract location
  const locationMatch = text.match(/(?:location|address|city)[:\s]*([^,\n]{3,50})/i);
  const location = locationMatch ? locationMatch[1].trim() : "";

  // Calculate parsing confidence
  const hasEmail = email.length > 0;
  const hasPhone = phone.length > 0;
  const hasName = name.length > 0 && name !== fileName.replace(".pdf", "").replace(/[_-]/g, " ");
  const hasSkills = allSkills.length > 0;
  const hasEducation = education.length > 0;
  
  const confidenceScore = [hasEmail, hasPhone, hasName, hasSkills, hasEducation]
    .filter(Boolean).length * 20;

  return {
    name,
    email,
    phone,
    linkedin,
    github,
    website,
    location,
    skills: allSkills,
    skillsByCategory: foundSkills,
    yearsOfExperience,
    education,
    certifications,
    workHistory,
    rawText: text.substring(0, 3000),
    textLength: text.length,
    confidenceScore,
    parsingDetails: {
      extractedEmail: hasEmail,
      extractedPhone: hasPhone,
      extractedName: hasName,
      extractedSkills: allSkills.length,
      extractedEducation: education.length,
      extractedCertifications: certifications.length,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      try {
        let text = "";
        let extractionMethod = "ocr";

        // Use OCR Space API for PDF extraction
        console.log(`[Resume Parser] Processing ${file.name} with OCR...`);
        text = await extractTextWithOCR(file);
        
        if (text.trim().length > 50) {
          console.log(`[Resume Parser] OCR extracted ${text.length} chars`);
        } else {
          extractionMethod = "failed";
          console.log(`[Resume Parser] OCR extraction failed or minimal text`);
        }

        const parsed = parseResumeText(text, file.name);

        results.push({
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          extractionMethod,
          ...parsed,
          success: text.length > 50,
        });
      } catch (error) {
        console.error(`[Resume Parser] Error parsing ${file.name}:`, error);
        results.push({
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          name: file.name.replace(".pdf", "").replace(/[_-]/g, " "),
          email: "",
          phone: "",
          linkedin: "",
          github: "",
          website: "",
          location: "",
          skills: [],
          skillsByCategory: {},
          yearsOfExperience: "Not specified",
          education: [],
          certifications: [],
          workHistory: [],
          rawText: "",
          textLength: 0,
          confidenceScore: 0,
          parsingDetails: {
            extractedEmail: false,
            extractedPhone: false,
            extractedName: false,
            extractedSkills: 0,
            extractedEducation: 0,
            extractedCertifications: 0,
          },
          extractionMethod: "failed",
          success: false,
          error: error instanceof Error ? error.message : "Failed to parse PDF",
        });
      }
    }

    return NextResponse.json({ 
      candidates: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        avgConfidence: Math.round(
          results.filter(r => r.success).reduce((sum, r) => sum + (r.confidenceScore || 0), 0) /
          Math.max(1, results.filter(r => r.success).length)
        ),
      }
    });
  } catch (error) {
    console.error("[Resume Parser] Error processing resumes:", error);
    return NextResponse.json({ error: "Failed to process resumes" }, { status: 500 });
  }
}
