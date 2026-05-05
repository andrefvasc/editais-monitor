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

/**
 * Scraper para o portal da FUNCAP (Inovação e Ciência)
 */
export async function scrapeFuncap(): Promise<ScrapedEdital[]> {
  const pageUrl = 'https://montenegro.funcap.ce.gov.br/sugba/editais-site-wordpress';
  const pdfBase = 'https://montenegro.funcap.ce.gov.br';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const allPdfLinks: string[] = [];
    $('ul.ListaDecorada li a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('/edital/') && !href.includes('/resultados/')) {
        const clean = href.replace(/^\.\.\//, '/');
        allPdfLinks.push(`${pdfBase}${clean}`);
      }
    });

    let pdfIndex = 0;
    $('td.laranja').each((_i, el) => {
      const title = $(el).find('span').text().trim() || $(el).find('a').text().trim();
      if (!title) return;
      if (title.toLowerCase().includes('resultado')) return;

      const link = allPdfLinks[pdfIndex] || 'https://www.funcap.ce.gov.br/editais/';
      pdfIndex++;

      const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 8);
      const id = `FUNCAP-${hash}`;

      editais.push({
        id,
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
    console.error('Erro ao fazer scrape da FUNCAP:', error);
    return [];
  }
}

/**
 * Scraper para o portal da SEPLAG (Planejamento e Gestão)
 * Foca em editais de concursos e seleções.
 */
export async function scrapeSeplag(): Promise<ScrapedEdital[]> {
  const url = 'https://www.seplag.ce.gov.br/category/noticias/';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    $('.news-card').each((_i, element) => {
      const titleElement = $(element).find('.card-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href') || url;

      // Só aceita se no título tiver palavras de edital/seleção
      const lowerTitle = title.toLowerCase();
      if (
        lowerTitle.includes('edital') || 
        lowerTitle.includes('seleção') || 
        lowerTitle.includes('credenciamento') ||
        lowerTitle.includes('chamada pública')
      ) {
        const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 8);
        const id = `SEPLAG-${hash}`;

        editais.push({
          id,
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
    console.error('Erro ao fazer scrape da SEPLAG:', error);
    return [];
  }
}

/**
 * Scraper genérico do Governo do Ceará
 */
export async function scrapeCearaGov(): Promise<ScrapedEdital[]> {
  // Mudamos para a busca direta por editais, que é mais estável que as categorias
  const url = 'https://www.ce.gov.br/?s=edital';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) return []; // Se der 404 ou 500 na busca, apenas pula

    const html = await response.text();
    const $ = cheerio.load(html);

    $('.news-card').each((_i, element) => {
      const titleElement = $(element).find('.card-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href') || url;

      let organization = 'GOVERNO DO CEARÁ';
      const upperTitle = title.toUpperCase();
      if (upperTitle.includes('SECULT') || upperTitle.includes('CULTURA')) {
        organization = 'SECULT';
      } else if (upperTitle.includes('SPS')) {
        organization = 'SPS';
      } else if (upperTitle.includes('SEPLAG')) {
        organization = 'SEPLAG';
      }

      const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 8);
      const id = `CEGOV-${hash}`;

      if (title && !title.toLowerCase().includes('resultado')) {
        editais.push({
          id,
          title,
          organization,
          publishDate: new Date().toISOString(),
          link,
          status: 'Aberto',
          notified: false
        });
      }
    });

    return editais;
  } catch (error) {
    console.error('Erro ao fazer scrape do Portal Ceará:', error);
    return [];
  }
}

/**
 * Scraper para o portal da FINEP (Nacional)
 */
export async function scrapeFinep(): Promise<ScrapedEdital[]> {
  const url = 'http://www.finep.gov.br/chamadas-publicas/chamadaspublicas?situacao=aberta';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    $('#conteudoChamada h3 a').each((_i, element) => {
      const title = $(element).text().trim();
      const relativeLink = $(element).attr('href') || '';
      const link = relativeLink.startsWith('http')
        ? relativeLink
        : `http://www.finep.gov.br${relativeLink}`;

      const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 8);
      const id = `FINEP-${hash}`;

      if (title) {
        editais.push({
          id,
          title,
          organization: 'FINEP',
          publishDate: new Date().toISOString(),
          link,
          status: 'Aberto',
          notified: false
        });
      }
    });

    return editais;
  } catch (error) {
    console.error('Erro ao fazer scrape da FINEP:', error);
    return [];
  }
}

/**
 * Scraper para o portal Prosas
 */
export async function scrapeProsas(): Promise<ScrapedEdital[]> {
  return [];
}
