//********************************************************************************************
// PromptsConfig.tsx
//
// This file provides a configuration screen for editing the prompts used by the plugin.
// It allows customizing the base prompt, alt generation prompt, and field-specific prompts.
// Users can revert to default prompts or save their customized prompts.
//
// The component:
// - Loads current prompt configurations from plugin parameters.
// - Displays textareas to edit each prompt.
// - Offers a button to restore defaults and a button to save changes.
//********************************************************************************************

import { RenderPageCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, Spinner } from 'datocms-react-ui';
import s from '../styles.module.css';
import { useState } from 'react';
import ReactTextareaAutosize from 'react-textarea-autosize';
import { ctxParamsType, FieldPrompts } from './ConfigScreen';
import { basePrompt } from '../../prompts/BasePrompt';
import { AltGenerationPrompt } from '../../prompts/AltGenerationPrompt';
import { fieldPrompt } from '../../prompts/FieldPrompts';

type PropTypes = {
  ctx: RenderPageCtx;
};

// saveApiKey updates the plugin parameters with the edited prompts:
async function saveApiKey(
  ctx: RenderPageCtx,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  currentParams: ctxParamsType,
  basePrompt: string,
  altGenerationPrompt: string,
  currentFieldPrompts: FieldPrompts
) {
  setIsLoading(true);
  await ctx.updatePluginParameters({
    ...currentParams,
    prompts: {
      basePrompt: basePrompt,
      altGenerationPrompt: altGenerationPrompt,
      fieldPrompts: currentFieldPrompts,
    },
  });
  setIsLoading(false);
  ctx.customToast({
    type: 'notice',
    message: 'Prompts saved!',
    dismissOnPageChange: true,
    dismissAfterTimeout: 5000,
  });
}

// The PromptsConfig component:
// - Loads existing prompts or defaults if none are set
// - Allows user to edit prompts inline
// - Can restore defaults
// - Saves changes back to plugin parameters
export default function PromptsConfig({ ctx }: PropTypes) {
  const params = ctx.plugin.attributes.parameters as ctxParamsType;

  const [currentBasePrompt, setBasePrompt] = useState(
    params.prompts?.basePrompt || basePrompt
  );
  const [currentAltGenerationPrompt, setAltGenerationPrompt] = useState(
    params.prompts?.altGenerationPrompt || AltGenerationPrompt
  );
  const [currentFieldPrompts, setFieldPrompts] = useState(
    params.prompts?.fieldPrompts || fieldPrompt
  );

  const [isLoading, setIsLoading] = useState(false);

  return (
    <Canvas ctx={ctx}>
      <div className={s.configContainer}>
        {/* A warning message about modifying these prompts */}
        <div
          style={{
            backgroundColor: 'var(--alert-color)',
            padding: 'var(--spacing-l)',
            borderRadius: '8px',
            marginBottom: 'var(--spacing-s)',
            color: 'white',
            border: '1px solid #f5c6cb',
            fontSize: 'var(--font-size-l)',
            textAlign: 'center',
          }}
        >
          <div>Modifying these prompts may affect the behavior of the AI</div>
          <div>Returning unexpected values can cause the plugin to crash</div>
        </div>

        {/* Base prompt configuration */}
        <div>
          <span className={s.label}>Base Prompt</span>
          <ReactTextareaAutosize
            value={currentBasePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
            name="basePrompt"
            id="basePrompt"
            className={s.textarea}
          />
          <span className={s.hint}>
            This is the base prompt that will be used for all queries. It should
            guide the model on how to respond. Keep it format-agnostic.
          </span>
        </div>

        {/* Alt generation prompt configuration */}
        <div>
          <span className={s.label}>Alt Generation Prompt</span>
          <ReactTextareaAutosize
            value={currentAltGenerationPrompt}
            onChange={(e) => setAltGenerationPrompt(e.target.value)}
            name="altGenerationPrompt"
            id="altGenerationPrompt"
            className={s.textarea}
          />
          <span className={s.hint}>
            This prompt is used for alt text generation of images. Ensure it
            returns only descriptive text.
          </span>
        </div>

        {/* Field prompts section header */}
        <span className={s.fieldLabelTitle}>Field Prompts</span>
        <span className={s.fieldLabelHint}>
          These prompts are used per field type. They are prefixed with
          instructions like "Return in a format of...".
        </span>

        {/* Editing each field type prompt */}
        <div>
          <span className={s.label}>Single Line Text Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.single_line}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                single_line: e.target.value,
              })
            }
            name="fieldPrompts-single_line"
            id="fieldPrompts-single_line"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Markdown Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.markdown}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                markdown: e.target.value,
              })
            }
            name="fieldPrompts-markdown"
            id="fieldPrompts-markdown"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>WYSIWYG Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.wysiwyg}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                wysiwyg: e.target.value,
              })
            }
            name="fieldPrompts-wysiwyg"
            id="fieldPrompts-wysiwyg"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Slug Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.slug}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                slug: e.target.value,
              })
            }
            name="fieldPrompts-slug"
            id="fieldPrompts-slug"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>SEO Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.seo}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                seo: e.target.value,
              })
            }
            name="fieldPrompts-seo"
            id="fieldPrompts-seo"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Map Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.map}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                map: e.target.value,
              })
            }
            name="fieldPrompts-map"
            id="fieldPrompts-map"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>JSON Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.json}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                json: e.target.value,
              })
            }
            name="fieldPrompts-json"
            id="fieldPrompts-json"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Integer Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.integer}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                integer: e.target.value,
              })
            }
            name="fieldPrompts-integer"
            id="fieldPrompts-integer"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Float Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.float}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                float: e.target.value,
              })
            }
            name="fieldPrompts-float"
            id="fieldPrompts-float"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Date Picker Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.date_picker}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                date_picker: e.target.value,
              })
            }
            name="fieldPrompts-date_picker"
            id="fieldPrompts-date_picker"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Date Time Picker Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.date_time_picker}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                date_time_picker: e.target.value,
              })
            }
            name="fieldPrompts-date_time_picker"
            id="fieldPrompts-date_time_picker"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Color Picker Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.color_picker}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                color_picker: e.target.value,
              })
            }
            name="fieldPrompts-color_picker"
            id="fieldPrompts-color_picker"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Boolean Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.boolean}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                boolean: e.target.value,
              })
            }
            name="fieldPrompts-boolean"
            id="fieldPrompts-boolean"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}>Textarea Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.textarea}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                textarea: e.target.value,
              })
            }
            name="fieldPrompts-textarea"
            id="fieldPrompts-textarea"
            className={s.textarea}
          />
        </div>

        {/* Buttons to restore defaults or save */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-m)',
            flexDirection: 'column',
          }}
        >
          <Button
            disabled={isLoading}
            fullWidth
            onClick={() => {
              saveApiKey(
                ctx,
                setIsLoading,
                params,
                basePrompt,
                AltGenerationPrompt,
                fieldPrompt
              );
              setBasePrompt(basePrompt);
              setAltGenerationPrompt(AltGenerationPrompt);
              setFieldPrompts(fieldPrompt);
            }}
          >
            Restore Default Prompts
          </Button>

          <Button
            disabled={isLoading}
            fullWidth
            buttonType="primary"
            onClick={() => {
              saveApiKey(
                ctx,
                setIsLoading,
                params,
                currentBasePrompt,
                currentAltGenerationPrompt,
                currentFieldPrompts
              );
            }}
          >
            {isLoading ? 'Saving...' : 'Save'}{' '}
            {isLoading && <Spinner size={24} />}
          </Button>
        </div>
      </div>
    </Canvas>
  );
}
