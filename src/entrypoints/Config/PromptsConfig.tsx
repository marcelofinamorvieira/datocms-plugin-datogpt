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
            This is the base prompt that will be used for all prompts. It should
            prime the model with the right context on how to reply. The format
            of the answer should be kept agnostic here, as it will be added
            later.
          </span>
        </div>
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
            This is the prompt that will be used for alt generation. Make sure
            it only returns plain text, and describes the image
          </span>
        </div>

        <span className={s.fieldLabelTitle}>Field Prompts</span>
        <span className={s.fieldLabelHint}>
          These prompts will be used for each type of filed, and are prefixed
          with "Return the value in a format off..."
        </span>

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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
            className={s.textarea}
          />
        </div>

        <div>
          <span className={s.label}> Float Prompt</span>
          <ReactTextareaAutosize
            value={currentFieldPrompts.float}
            onChange={(e) =>
              setFieldPrompts({
                ...currentFieldPrompts,
                float: e.target.value,
              })
            }
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
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
            name="fieldPrompts"
            id="fieldPrompts"
            className={s.textarea}
          />
        </div>

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
