
export interface EmailTemplateOptions {
  title: string;
  preheader?: string;
  recipientName?: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText?: string;
}

export function createEmailTemplate(options: EmailTemplateOptions): string {
  const {
    title,
    preheader = '',
    recipientName = '',
    content,
    buttonText,
    buttonUrl,
    footerText = 'Human Kind Award - Supporting wellbeing in education'
  } = options;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${preheader ? `<meta name="description" content="${preheader}">` : ''}
      <style>
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;600;700&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #3c3c3c;
          background-color: #f8f9fa;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .email-header {
          background: linear-gradient(135deg, #bc9c22 0%, #832232 100%);
          padding: 30px 20px;
          text-align: center;
        }
        
        .logo {
          max-width: 200px;
          height: auto;
          margin-bottom: 10px;
        }
        
        .email-title {
          font-family: 'League Spartan', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 15px 0 0 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .email-content {
          padding: 40px 30px;
        }
        
        .greeting {
          font-family: 'League Spartan', sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: #3c3c3c;
          margin-bottom: 20px;
        }
        
        .content-text {
          font-size: 16px;
          line-height: 1.6;
          color: #3c3c3c;
          margin-bottom: 20px;
        }
        
        .content-text:last-of-type {
          margin-bottom: 30px;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #bc9c22 0%, #832232 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 6px;
          font-family: 'League Spartan', sans-serif;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
          box-shadow: 0 3px 6px rgba(188, 156, 34, 0.3);
          transition: transform 0.2s ease;
        }
        
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 12px rgba(188, 156, 34, 0.4);
        }
        
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        
        .email-footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        
        .footer-text {
          font-size: 14px;
          color: #6c757d;
          margin: 0;
          line-height: 1.5;
        }
        
        .footer-brand {
          font-family: 'League Spartan', sans-serif;
          font-weight: 600;
          color: #bc9c22;
        }
        
        .url-fallback {
          font-size: 14px;
          color: #6c757d;
          margin-top: 20px;
          word-break: break-all;
        }
        
        .url-fallback a {
          color: #bc9c22;
          text-decoration: underline;
        }
        
        @media only screen and (max-width: 600px) {
          .email-container {
            margin: 0;
            border-radius: 0;
          }
          
          .email-content {
            padding: 30px 20px;
          }
          
          .email-header {
            padding: 25px 20px;
          }
          
          .logo {
            max-width: 150px;
          }
          
          .email-title {
            font-size: 24px;
          }
          
          .cta-button {
            display: block;
            margin: 20px auto;
            max-width: 250px;
          }
        }
      </style>
    </head>
    <body>
      ${preheader ? `
        <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
          ${preheader}
        </div>
      ` : ''}
      
      <div class="email-container">
        <div class="email-header">
          <img src="https://www.humankindaward.com/wp-content/uploads/2025/06/Human-Kind-Logo-Colour-Horizontal-Transparent.png" 
               alt="Human Kind Award" 
               class="logo">
          <h1 class="email-title">${title}</h1>
        </div>
        
        <div class="email-content">
          ${recipientName ? `<div class="greeting">Hello ${recipientName},</div>` : ''}
          
          <div class="content-text">
            ${content}
          </div>
          
          ${buttonText && buttonUrl ? `
            <div class="button-container">
              <a href="${buttonUrl}" class="cta-button">${buttonText}</a>
            </div>
            
            <div class="url-fallback">
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <a href="${buttonUrl}">${buttonUrl}</a>
            </div>
          ` : ''}
        </div>
        
        <div class="email-footer">
          <p class="footer-text">
            <span class="footer-brand">${footerText}</span><br>
            Supporting wellbeing and excellence in educational environments
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
