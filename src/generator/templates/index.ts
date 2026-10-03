// The template library. Adding a template means adding a record here, not
// changing the generator — see PRD §3's success criterion.

import type { Template, TemplateId } from "../types";
import { bbbOriginalTemplate } from "./bbb-original";
import { beginnerTemplate } from "./beginner";
import { original531AbTemplate } from "./original-531-ab";
import { original53110RepTemplate } from "./original-531-10rep";
import { original531Template } from "./original-531";

export const TEMPLATES: Record<TemplateId, Template> = {
  [beginnerTemplate.id]: beginnerTemplate,
  [bbbOriginalTemplate.id]: bbbOriginalTemplate,
  [original531Template.id]: original531Template,
  [original53110RepTemplate.id]: original53110RepTemplate,
  [original531AbTemplate.id]: original531AbTemplate,
};

export function getTemplate(id: TemplateId): Template {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`Unknown template id: ${id}`);
  }
  return template;
}
