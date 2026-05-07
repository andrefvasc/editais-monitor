import * as cheerio from 'cheerio';
import crypto from 'crypto';

// Alguns sites governamentais têm certificados SSL antigos ou inválidos.
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

// Utilitário para fetch com timeout
async function fetchWithTimeout(url: string, options: any = {}, timeout = 10000) {
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
 * Verifica se o edital é recente (2025 ou 2026)
 */
function isRecent(title: string): boolean {
  const currentYears = ['2025', '2026', '26', '25'];
  const text = title.toLowerCase();
  // Se o título explicitamente menciona um ano antigo, descarta
  if (text.includes('2010') || text.includes('2011') || text.includes('2014') || text.includes('2016') || text.includes('2018') || text.includes('2020') || text.includes('2022')) {
    return false;
  }
  // Se menciona um dos anos atuais ou não menciona ano nenhum (pode ser novo), aceita
  return true; 
}

/**
 * Scraper para o portal da FUNCAP
 */
export async function scrapeFuncap(): Promise<ScrapedEdital[]> {
  const pageUrl = 'https://montenegro.funcap.ce.gov.br/sugba/editais-site-wordpress';
  const pdfBase = 'https://montenegro.funcap.ce.gov.br';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetchWithTimeout(pageUrl);
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    const allPdfLinks: string[] = [];
    $('ul.ListaDecorada li a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('/edital/') && !href.includes('/resultados/') && !href.includes('/prorrogacao/')) {
        const clean = href.replace(/^\.\.\//, '/');
        allPdfLinks.push(`${pdfBase}${clean}`);
      }
    });

    let pdfIndex = 0;
    $('td.laranja').each((_i, el) => {
      const title = $(el).find('span').text().trim() || $(el).find('a').text().trim();
      if (!title || title.toLowerCase().includes('resultado')) return;

      const link = allPdfLinks[pdfIndex] || 'https://www.funcap.ce.gov.br/editais/';
      pdfIndex++;

      // Filtro de Ano e Relevância
      if (!isRecent(title)) return;

      const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({
        id: `FUNCAP-${hash}`,
        title,
        organization: 'FUNCAP',
        publishDate: new Date().toISOString(),
        link,
        status: 'Aberto',
        notified: false
      });
    });

    return editais;
  } catch (error) {
    console.error('Erro FUNCAP:', error);
    return [];
  }
}

/**
 * Scraper para o portal da SECULT
 */
export async function scrapeSecult(): Promise<ScrapedEdital[]> {
  const url = 'https://www.secult.ce.gov.br/';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    $('.news-card, article, .post').each((_i, element) => {
      const titleElement = $(element).find('h3 a, .card-title a, a').first();
      const title = titleElement.text().trim();
      const link = titleElement.attr('href') || '';

      if (!title || !isRecent(title)) return;

      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('edital') || lowerTitle.includes('mecenas') || lowerTitle.includes('chamada')) {
        const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
        editais.push({
          id: `SECULT-${hash}`,
          title,
          organization: 'SECULT',
          publishDate: new Date().toISOString(),
          link,
          status: 'Aberto',
          notified: false
        });
      }
    });

    return editais;
  } catch (error) {
    console.error('Erro SECULT:', error);
    return [];
  }
}

/**
 * Scraper para o portal da SEPLAG
 */
export async function scrapeSeplag(): Promise<ScrapedEdital[]> {
  const url = 'https://www.seplag.ce.gov.br/category/noticias/';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    $('.news-card').each((_i, element) => {
      const titleElement = $(element).find('.card-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href') || url;

      if (!title || !isRecent(title)) return;

      const lowerTitle = title.toLowerCase();
      const isRelevant = ['edital', 'seleção', 'selecao', 'credenciamento', 'chamada pública'].some(k => lowerTitle.includes(k));

      if (isRelevant) {
        const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
        editais.push({
          id: `SEPLAG-${hash}`,
          title,
          organization: 'SEPLAG',
          publishDate: new Date().toISOString(),
          link,
          status: 'Aberto',
          notified: false
        });
      }
    });

    return editais;
  } catch (error) {
    console.error('Erro SEPLAG:', error);
    return [];
  }
}

/**
 * Scraper genérico do Governo do Ceará
 */
export async function scrapeCearaGov(): Promise<ScrapedEdital[]> {
  const url = 'https://www.ce.gov.br/?s=edital';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    $('.news-card').each((_i, element) => {
      const titleElement = $(element).find('.card-title a');
      const title = titleElement.text().trim();
      if (!title || !isRecent(title)) return;

      const link = titleElement.attr('href') || url;
      let organization = 'GOVERNO DO CEARÁ';
      const upperTitle = title.toUpperCase();
      
      if (upperTitle.includes('SECULT') || upperTitle.includes('CULTURA')) organization = 'SECULT';
      else if (upperTitle.includes('SPS')) organization = 'SPS';
      else if (upperTitle.includes('SEPLAG')) organization = 'SEPLAG';

      const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({
        id: `CEGOV-${hash}`,
        title,
        organization,
        publishDate: new Date().toISOString(),
        link,
        status: 'Aberto',
        notified: false
      });
    });

    return editais;
  } catch (error) {
    console.error('Erro Ceará Gov:', error);
    return [];
  }
}

/**
 * Scraper para o portal da FINEP
 */
export async function scrapeFinep(): Promise<ScrapedEdital[]> {
  const url = 'http://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    $('#conteudoChamada h3 a').each((_i, element) => {
      const title = $(element).text().trim();
      const relativeLink = $(element).attr('href') || '';
      const link = relativeLink.startsWith('http') ? relativeLink : `http://www.finep.gov.br${relativeLink}`;

      if (!title || !isRecent(title)) return;

      const hash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex').substring(0, 8);
      editais.push({
        id: `FINEP-${hash}`,
        title,
        organization: 'FINEP',
        publishDate: new Date().toISOString(),
        link,
        status: 'Aberto',
        notified: false
      });
    });

    return editais;
  } catch (error) {
    console.error('Erro FINEP:', error);
    return [];
  }
}

export async function scrapeProsas(): Promise<ScrapedEdital[]> {
  return [];
}
