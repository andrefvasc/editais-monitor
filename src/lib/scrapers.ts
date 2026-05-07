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
 * Filtro de temporalidade definitivo
 */
function isRecent(title: string): boolean {
  const text = title.toLowerCase();
  const years = text.match(/\d{4}/g);
  
  // Se tem anos antigos no título (ex: 2023, 2014), bloqueia
  const oldYears = ['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'];
  if (oldYears.some(y => text.includes(y))) return false;

  // Se tem anos de 4 dígitos, tem que ser 2025 ou 2026
  if (years && !years.some(y => y === '2025' || y === '2026')) return false;

  return true;
}

/**
 * Inteligência de busca de oportunidade real
 */
async function findRealOpportunity(url: string): Promise<string> {
  if (url.includes('.pdf') || url.includes('mapacultural.secult.ce.gov.br/oportunidade/')) return url;
  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    let bestLink = url;
    
    $('a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      
      if (href.includes('mapacultural.secult.ce.gov.br/oportunidade/')) {
        bestLink = href;
        return false; 
      }
      if (href.endsWith('.pdf') && (href.toLowerCase().includes('edital') || text.includes('edital') || text.includes('clique aqui'))) {
        bestLink = href;
      }
    });
    return bestLink;
  } catch { return url; }
}

/**
 * Scraper FUNCAP - Portal Técnico
 */
export async function scrapeFuncap(): Promise<ScrapedEdital[]> {
  const pageUrl = 'https://montenegro.funcap.ce.gov.br/sugba/editais-site-wordpress';
  const pdfBase = 'https://montenegro.funcap.ce.gov.br';
  const editais: ScrapedEdital[] = [];
  try {
    const response = await fetchWithTimeout(pageUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Primeiro, capturamos todos os títulos em ordem
    const titles: string[] = [];
    $('td.laranja, .edital-title').each((_i, el) => {
      const title = $(el).text().trim();
      if (title && !title.toLowerCase().includes('resultado') && isRecent(title)) {
        titles.push(title);
      }
    });

    // Depois, os links de editais (filtrando resultados)
    const links: string[] = [];
    $('a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('/edital/') && !href.includes('/resultados/') && !href.includes('/prorrogacao/')) {
        links.push(href.startsWith('http') ? href : `${pdfBase}${href.replace(/^\.\.\//, '/')}`);
      }
    });

    // Mapeamos 1 para 1
    titles.forEach((title, idx) => {
      const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({
        id: `FUNCAP-${hash}`,
        title, organization: 'FUNCAP',
        publishDate: new Date().toISOString(),
        link: links[idx] || 'https://www.funcap.ce.gov.br/editais/',
        status: 'Aberto', notified: false
      });
    });
    return editais;
  } catch { return []; }
}

/**
 * Scraper SECULT - Focado em links de oportunidade
 */
export async function scrapeSecult(): Promise<ScrapedEdital[]> {
  const url = 'https://www.secult.ce.gov.br/category/editais/';
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
      if ((lowerTitle.includes('edital') || lowerTitle.includes('mecenas') || lowerTitle.includes('seleção')) && isRecent(title)) {
        candidates.push({ title, link });
      }
    });

    for (const cand of candidates.slice(0, 3)) {
      const realLink = await findRealOpportunity(cand.link);
      // Se não achou link real (portal ou PDF), ignora para não poluir com notícias
      if (realLink.includes('secult.ce.gov.br/20')) continue;

      const hash = crypto.createHash('md5').update(cand.title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({ id: `SECULT-${hash}`, title: cand.title, organization: 'SECULT', publishDate: new Date().toISOString(), link: realLink, status: 'Aberto', notified: false });
    }
    return editais;
  } catch { return []; }
}

/**
 * Scraper FINEP - Focado em Chamadas Reais
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
      if ((lowerTitle.includes('edital') || lowerTitle.includes('chamada pública')) && isRecent(title)) {
        candidates.push({ title, link: href.startsWith('http') ? href : `http://www.finep.gov.br${href}` });
      }
    });

    for (const cand of candidates.slice(0, 3)) {
      const realLink = await findRealOpportunity(cand.link);
      if (realLink.includes('/noticias/')) continue;

      const hash = crypto.createHash('md5').update(cand.title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({ id: `FINEP-${hash}`, title: cand.title, organization: 'FINEP', publishDate: new Date().toISOString(), link: realLink, status: 'Aberto', notified: false });
    }
    return editais;
  } catch { return []; }
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
      if (title.length < 30 || !link.startsWith('http')) return;
      if ((title.toLowerCase().includes('edital') || title.toLowerCase().includes('seleção')) && isRecent(title)) {
        const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
        editais.push({ id: `SEPLAG-${hash}`, title, organization: 'SEPLAG', publishDate: new Date().toISOString(), link, status: 'Aberto', notified: false });
      }
    });
    return editais;
  } catch { return []; }
}

export async function scrapeCearaGov(): Promise<ScrapedEdital[]> { return []; }
export async function scrapeProsas(): Promise<ScrapedEdital[]> { return []; }
