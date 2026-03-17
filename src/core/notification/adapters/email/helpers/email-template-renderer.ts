import { Injectable, Logger } from '@nestjs/common';
import * as pug from 'pug';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { EmailTemplateNotFoundError } from '../../../errors/email-template-not-found.error';
import { EmailTemplateRenderError } from '../../../errors/email-template-render.error';

@Injectable()
export class EmailTemplateRenderer {
  private readonly logger = new Logger(EmailTemplateRenderer.name);
  private readonly templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '..', 'templates');
  }

  /**
   * Render a Pug template with the provided data
   * @param templateName - Name of the template file (without .pug extension)
   * @param data - Data to pass to the template
   * @returns Rendered HTML string
   */
  async render(
    templateName: string,
    data: Record<string, unknown> = {},
  ): Promise<string> {
    const templatePath = path.join(
      this.templatesPath,
      `${templateName}.pug`,
    );

    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Template not found: ${templatePath}`);
      throw new EmailTemplateNotFoundError(templateName);
    }

    try {
      this.logger.debug(`Rendering template: ${templatePath}`);
      const compiledFunction = pug.compileFile(templatePath);
      const html = compiledFunction(data);

      this.logger.debug(
        `Template '${templateName}' rendered successfully`,
      );
      return html;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to render template '${templateName}': ${message}`,
      );
      throw new EmailTemplateRenderError(templateName, message);
    }
  }
}
