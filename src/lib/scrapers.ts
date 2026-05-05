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
 * Estrutura do HTML: td.laranja contém o título; ul.ListaDecorada li a[href]
 * nos tr seguintes contém os PDFs diretos do edital.
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

    // Coletar primeiro todos os links PDF da página em ordem
    // Cada href "../edital/NNN.pdf" corresponde a um edital
    const allPdfLinks: string[] = [];
    $('ul.ListaDecorada li a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      // Só o arquivo principal do edital (não resultados, não adendos como primeiro)
      if (href.includes('/edital/') && !href.includes('/resultados/')) {
        const clean = href.replace(/^\.\.\//, '/');
        allPdfLinks.push(`${pdfBase}${clean}`);
      }
    });

    // Coletar os títulos dos programas (td.laranja > a > span ou td.laranja > a)
    let pdfIndex = 0;
    $('td.laranja').each((_i, el) => {
      const title = $(el).find('span').text().trim() || $(el).find('a').text().trim();
      if (!title) return;
      if (title.toLowerCase().includes('resultado')) return;

      // Associar o próximo PDF disponível a este título
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
 * Scraper genérico do Governo do Ceará (focado em Cultura e outros)
 */
export async function scrapeCearaGov(): Promise<ScrapedEdital[]> {
  const url = 'https://www.ce.gov.br/category/editais/';
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

    $('article.news-card').each((_i, element) => {
      const titleElement = $(element).find('.card-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href') || url;

      let organization = 'GOVERNO DO CEARÁ';
      const upperTitle = title.toUpperCase();
      if (upperTitle.includes('SECULT') || upperTitle.includes('CULTURA')) {
        organization = 'SECULT';
      } else if (upperTitle.includes('SPS')) {
        organization = 'SPS';
      }

      const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 8);
      const id = `CEGOV-${hash}`;

      if (title) {
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
 * Links apontam para a página de detalhes de cada chamada pública.
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
 * A Prosas usa JavaScript dinâmico — aguardando API Key para integração real.
 */
export async function scrapeProsas(): Promise<ScrapedEdital[]> {
  return [];
}
