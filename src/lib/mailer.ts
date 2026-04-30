import nodemailer from 'nodemailer';

// Configuração padrão de SMTP. Para produção, ideal usar variáveis de ambiente.
// Aqui vamos usar um serviço de teste como Ethereal se não houver configs,
// ou permitir que usem Gmail com App Passwords configurando o .env.
export async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Se não houver configuração, cria uma conta de teste no Ethereal Email
  console.warn('⚠️ Sem configurações de SMTP. Usando Ethereal (conta de teste) para envio de emails.');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendEditalAlert(subscribers: {email: string, name?: string}[], newEditais: any[]) {
  const logs: { email: string; url?: string; status: string; error?: string }[] = [];
  if (!subscribers.length || !newEditais.length) return logs;

  const transporter = await getTransporter();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const editaisHtml = newEditais.map(ed => `
    <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
      <h3 style="margin-top: 0;">${ed.title}</h3>
      <p><strong>Órgão:</strong> ${ed.organization}</p>
      <p><strong>Data de Publicação:</strong> ${new Date(ed.publishDate).toLocaleDateString('pt-BR')}</p>
      <div style="margin-top: 15px;">
        <a href="${baseUrl}/edital/${ed.id}" style="display: inline-block; padding: 10px 15px; background: #059669; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Ver Resumo no Monitor</a>
        <a href="${ed.link}" style="display: inline-block; padding: 10px 15px; background: #3f3f46; color: white; text-decoration: none; border-radius: 5px;">Acessar Fonte Oficial</a>
      </div>
    </div>
  `).join('');

  for (const sub of subscribers) {
    try {
      const info = await transporter.sendMail({
        from: '"Monitor de Editais CE" <monitor@editais.ce.gov.br>',
        to: sub.email,
        subject: `🚨 Novos Editais Encontrados (${newEditais.length})!`,
        html: `
          <h2>Olá, ${sub.name || 'Assinante'}!</h2>
          <p>Encontramos novos editais relacionados aos seus temas de interesse (Inovação, Cultura, Futuro do Trabalho, Consultorias) lançados recentemente no Ceará.</p>
          <hr/>
          ${editaisHtml}
          <hr/>
          <p><small>Você está recebendo este e-mail porque se inscreveu no Monitor de Editais CE.</small></p>
        `,
      });

      const url = nodemailer.getTestMessageUrl(info);
      console.log(`Email enviado para ${sub.email}. URL de pré-visualização (se for Ethereal): ${url}`);
      logs.push({ email: sub.email, status: 'Enviado', url: url || undefined });
    } catch (error: any) {
      console.error(`Falha ao enviar email para ${sub.email}:`, error);
      logs.push({ email: sub.email, status: 'Erro', error: error.message });
    }
  }

  return logs;
}
