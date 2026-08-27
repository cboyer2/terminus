// The template library. Adding a template means adding a record here, not
// changing the generator — see PRD §3's success criterion.

import type { Template, TemplateId } from "../types";
import { bbbOriginalTemplate } from "./bbb-original";
import { beginnerTemplate } from "./beginner";
import { original531Template } from "./original-531";

export const TEMPLATES: Record<TemplateId, Template> = {
  [beginnerTemplate.id]: beginnerTemplate,
  [bbbOriginalTemplate.id]: bbbOriginalTemplate,
  [original531Template.id]: original531Template,
};

export function getTemplate(id: TemplateId): Template {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`Unknown template id: ${id}`);
  }
  return template;
}
