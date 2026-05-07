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

function isRecent(title: string): boolean {
  const text = title.toLowerCase();
  const oldYears = ['2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024'];
  if (oldYears.some(y => text.includes(y))) return false;
  return true;
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
      editais.push({ id: `FUNCAP-${hash}`, title, organization: 'FUNCAP', publishDate: new Date().toISOString(), link, status: 'Aberto', notified: false });
    });
    return editais;
  } catch (e) { return []; }
}

/**
 * Scraper SECULT
 */
export async function scrapeSecult(): Promise<ScrapedEdital[]> {
  const url = 'https://www.secult.ce.gov.br/';
  const editais: ScrapedEdital[] = [];
  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    $('a').each((_i, element) => {
      const title = $(element).text().trim().replace(/\s+/g, ' ');
      const link = $(element).attr('href') || '';
      if (title.length < 20 || !link.startsWith('http')) return;
      const lowerTitle = title.toLowerCase();
      const keywords = ['edital', 'mecenas', 'chamada', 'seleção', 'fomento', 'inscrições', 'convocatória'];
      if (keywords.some(k => lowerTitle.includes(k)) && isRecent(title)) {
        const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
        editais.push({ id: `SECULT-${hash}`, title, organization: 'SECULT', publishDate: new Date().toISOString(), link, status: 'Aberto', notified: false });
      }
    });
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
      if (title.length < 15 || !link.startsWith('http')) return;
      const lowerTitle = title.toLowerCase();
      if (['edital', 'seleção', 'credenciamento', 'chamada pública'].some(k => lowerTitle.includes(k)) && isRecent(title)) {
        const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
        editais.push({ id: `SEPLAG-${hash}`, title, organization: 'SEPLAG', publishDate: new Date().toISOString(), link, status: 'Aberto', notified: false });
      }
    });
    return editais;
  } catch (e) { return []; }
}

/**
 * Scraper FINEP
 */
export async function scrapeFinep(): Promise<ScrapedEdital[]> {
  const url = 'http://www.finep.gov.br/noticias';
  const editais: ScrapedEdital[] = [];
  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    $('h2 a, h3 a, .noticia-titulo a').each((_i, element) => {
      const title = $(element).text().trim().replace(/\s+/g, ' ');
      const href = $(element).attr('href') || '';
      if (title.length < 25) return;
      const lowerTitle = title.toLowerCase();
      const keywords = ['edital', 'chamada pública', 'seleção', 'recursos não reembolsáveis', 'subvenção'];
      if (keywords.some(k => lowerTitle.includes(k)) && isRecent(title)) {
        const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
        editais.push({ id: `FINEP-${hash}`, title, organization: 'FINEP', publishDate: new Date().toISOString(), link: href.startsWith('http') ? href : `http://www.finep.gov.br${href}`, status: 'Aberto', notified: false });
      }
    });
    return editais;
  } catch (e) { return []; }
}

/**
 * Scraper Ceará Gov
 */
export async function scrapeCearaGov(): Promise<ScrapedEdital[]> {
  const url = 'https://www.ceara.gov.br/category/editais/';
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
      if (['edital', 'seleção', 'chamada', 'concurso', 'oportunidade'].some(k => lowerTitle.includes(k)) && isRecent(title)) {
        const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
        editais.push({ id: `CEGOV-${hash}`, title, organization: 'GOVERNO DO CEARÁ', publishDate: new Date().toISOString(), link, status: 'Aberto', notified: false });
      }
    });
    return editais;
  } catch (e) { return []; }
}

export async function scrapeProsas(): Promise<ScrapedEdital[]> { return []; }
