import * as cheerio from 'cheerio';
import crypto from 'crypto';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface ScrapedEdital {
  id: string;
  title: string;
  organization: string;
  publishDate: string;
  link: string;
  status: string;
  notified: boolean;
}

async function fetchWithTimeout(url: string, options: any = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Função "Deep Scan": Visita uma página de notícia para tentar encontrar o link direto do Edital (PDF ou Mapa Cultural)
 */
async function findDirectLink(url: string): Promise<string> {
  if (url.includes('.pdf') || url.includes('mapacultural.secult.ce.gov.br/oportunidade/')) {
    return url;
  }

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    let directLink = url;

    // Procura por links que pareçam ser o edital real
    $('a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      
      // Prioridade 1: Mapa Cultural ou Links de Oportunidade
      if (href.includes('mapacultural.secult.ce.gov.br/oportunidade/')) {
        directLink = href;
        return false; // break
      }

      // Prioridade 2: PDFs que contenham "edital" no nome ou no texto do link
      if (href.endsWith('.pdf') && (href.toLowerCase().includes('edital') || text.includes('edital') || text.includes('clique aqui'))) {
        directLink = href;
        // Não damos break aqui pois pode haver um link melhor (Mapa Cultural) depois
      }
    });

    return directLink;
  } catch (e) {
    return url;
  }
}

function isRecent(title: string): boolean {
  const text = title.toLowerCase();
  const oldYears = ['2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'];
  return !oldYears.some(y => text.includes(y));
}

/**
 * Scraper FUNCAP
 */
export async function scrapeFuncap(): Promise<ScrapedEdital[]> {
  const pageUrl = 'https://montenegro.funcap.ce.gov.br/sugba/editais-site-wordpress';
  const pdfBase = 'https://montenegro.funcap.ce.gov.br';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetchWithTimeout(pageUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const allPdfLinks: string[] = [];
    $('a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('/edital/') && !href.includes('/resultados/')) {
        allPdfLinks.push(href.startsWith('http') ? href : `${pdfBase}${href.replace(/^\.\.\//, '/')}`);
      }
    });

    let pdfIndex = 0;
    $('td.laranja, .edital-title').each((_i, el) => {
      const title = $(el).text().trim();
      if (!title || title.toLowerCase().includes('resultado')) return;
      if (!isRecent(title)) return;

      const link = allPdfLinks[pdfIndex] || 'https://www.funcap.ce.gov.br/editais/';
      pdfIndex++;

      const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({
        id: `FUNCAP-${hash}`,
        title, organization: 'FUNCAP',
        publishDate: new Date().toISOString(),
        link, status: 'Aberto', notified: false
      });
    });

    return editais;
  } catch (e) { return []; }
}

/**
 * Scraper SECULT com Deep Scan
 */
export async function scrapeSecult(): Promise<ScrapedEdital[]> {
  const url = 'https://www.secult.ce.gov.br/';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const candidates: {title: string, link: string}[] = [];

    $('a').each((_i, element) => {
      const title = $(element).text().trim().replace(/\s+/g, ' ');
      const link = $(element).attr('href') || '';
      if (title.length < 25 || !link.startsWith('http')) return;
      
      const lowerTitle = title.toLowerCase();
      const isRelevant = ['edital', 'mecenas', 'chamada', 'seleção', 'convocatória'].some(k => lowerTitle.includes(k));

      if (isRelevant && isRecent(title)) {
        candidates.push({ title, link });
      }
    });

    // Deep Scan nos candidatos (limitado aos 5 primeiros para evitar timeout)
    for (const cand of candidates.slice(0, 5)) {
      const finalLink = await findDirectLink(cand.link);
      const hash = crypto.createHash('md5').update(cand.title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({
        id: `SECULT-${hash}`,
        title: cand.title,
        organization: 'SECULT',
        publishDate: new Date().toISOString(),
        link: finalLink,
        status: 'Aberto',
        notified: false
      });
    }

    return editais;
  } catch (e) { return []; }
}

/**
 * Scraper FINEP com Deep Scan
 */
export async function scrapeFinep(): Promise<ScrapedEdital[]> {
  const url = 'http://www.finep.gov.br/noticias';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const candidates: {title: string, link: string}[] = [];

    $('h2 a, h3 a, a').each((_i, element) => {
      const title = $(element).text().trim().replace(/\s+/g, ' ');
      const href = $(element).attr('href') || '';
      if (title.length < 30) return;
      
      const lowerTitle = title.toLowerCase();
      const isRelevant = lowerTitle.includes('edital') || lowerTitle.includes('chamada pública') || lowerTitle.includes('seleção');

      if (isRelevant && isRecent(title)) {
        const link = href.startsWith('http') ? href : `http://www.finep.gov.br${href}`;
        candidates.push({ title, link });
      }
    });

    for (const cand of candidates.slice(0, 5)) {
      const finalLink = await findDirectLink(cand.link);
      const hash = crypto.createHash('md5').update(cand.title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({
        id: `FINEP-${hash}`,
        title: cand.title,
        organization: 'FINEP',
        publishDate: new Date().toISOString(),
        link: finalLink,
        status: 'Aberto',
        notified: false
      });
    }

    return editais;
  } catch (e) { return []; }
}

/**
 * Scraper SEPLAG
 */
export async function scrapeSeplag(): Promise<ScrapedEdital[]> {
  const url = 'https://www.seplag.ce.gov.br/category/noticias/';
  const editais: ScrapedEdital[] = [];
  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    $('a').each((_i, element) => {
      const title = $(element).text().trim().replace(/\s+/g, ' ');
      const link = $(element).attr('href') || '';
      if (title.length < 25 || !link.startsWith('http')) return;
      const lowerTitle = title.toLowerCase();
      if (['edital', 'seleção', 'chamada pública'].some(k => lowerTitle.includes(k)) && isRecent(title)) {
        const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
        editais.push({ id: `SEPLAG-${hash}`, title, organization: 'SEPLAG', publishDate: new Date().toISOString(), link, status: 'Aberto', notified: false });
      }
    });
    return editais;
  } catch (e) { return []; }
}

export async function scrapeCearaGov(): Promise<ScrapedEdital[]> { return []; }
export async function scrapeProsas(): Promise<ScrapedEdital[]> { return []; }
