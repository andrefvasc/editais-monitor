import * as cheerio from 'cheerio';
import crypto from 'crypto';

// Alguns sites governamentais têm certificados SSL antigos ou inválidos,
// então precisamos ignorar os erros de SSL apenas para as requisições de scraper.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Tipo de retorno padrão
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
  const url = 'https://montenegro.funcap.ce.gov.br/sugba/editais-site-wordpress';
  const editais: ScrapedEdital[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // O portal da Funcap agrupa os editais em <tr> onde o título fica num <td class="laranja">
    $('td.laranja').each((i, element) => {
      const linkElement = $(element).find('a');
      const title = linkElement.text().trim();
      
      // O link geralmente é vazio ou aponta para um script, o PDF real fica nas linhas abaixo.
      // Para simplificar, direcionamos o usuário para a página de editais oficial.
      const editalLink = 'https://www.funcap.ce.gov.br/editais/';
      
      // Criar ID único baseado no título
      const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 8);
      const id = `FUNCAP-${hash}`;

      if (title && !title.toLowerCase().includes('resultado')) {
        editais.push({
          id,
          title,
          organization: 'FUNCAP',
          publishDate: new Date().toISOString(),
          link: editalLink,
          status: 'Aberto',
          notified: false
        });
      }
    });

    return editais;
  } catch (error) {
    console.error('Erro ao fazer scrape da FUNCAP:', error);
    return []; // Se der erro num portal, não quebra os outros
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

    // O portal usa <article class="news-card">
    $('article.news-card').each((i, element) => {
      const titleElement = $(element).find('.card-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href') || url;
      
      const dateElement = $(element).find('.date-post span');
      const dateText = dateElement.text().trim(); // ex: "02 de Janeiro de 2026"
      
      // Identificar o órgão pelo título (Heurística simples)
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
          publishDate: new Date().toISOString(), // Ideal seria fazer parse da data, mas usaremos a data de scraping para simplificar
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

    // Na Finep, os editais abertos ficam dentro de #conteudoChamada > h3 > a
    $('#conteudoChamada h3 a').each((i, element) => {
      const title = $(element).text().trim();
      const relativeLink = $(element).attr('href') || '';
      const link = relativeLink.startsWith('http') ? relativeLink : `http://www.finep.gov.br${relativeLink}`;
      
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
 * Nota: A Prosas carrega os editais via JavaScript dinamicamente.
 * Aguardando API Key para integração real.
 */
export async function scrapeProsas(): Promise<ScrapedEdital[]> {
  return [];
}
