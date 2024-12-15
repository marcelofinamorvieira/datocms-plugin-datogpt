import classNames from 'classnames';
import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  Dropdown,
  DropdownMenu,
  DropdownOption,
  TextField,
} from 'datocms-react-ui';
import { motion } from 'framer-motion';
import s from './styles.module.css';
import { useState } from 'react';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

type PropTypes = {
  handleGeneratePrompt: (blockType?: {
    name: string;
    apiKey: string;
    blockModelId: string;
    blockLevel: number;
    availableBlocks: string[];
  }) => void;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  isImprove: boolean;
  ctx: RenderFieldExtensionCtx;
};

type blockObjectType = {
  name: string;
  apiKey: string;
  blockModelId: string;
};

const ModularContentPrompting = ({
  handleGeneratePrompt,
  prompt,
  setPrompt,
  isImprove,
  ctx,
}: PropTypes) => {
  const availableBlockTypesIds = (
    ctx.field.attributes.validators.rich_text_blocks as Record<string, string[]>
  ).item_types;

  const availableOptions = availableBlockTypesIds.map((id) => {
    return {
      name: ctx.itemTypes[id]!.attributes.name!,
      apiKey: ctx.itemTypes[id]!.attributes.api_key!,
      blockModelId: ctx.itemTypes[id]!.id!,
    };
  });

  availableOptions.unshift({
    name: 'Auto-select block types from prompt',
    apiKey: 'auto_select_gpt_plugin',
    blockModelId: 'auto_select_gpt_plugin',
  });

  const [availableBlockTypes, setAvailableBlockTypes] =
    useState<blockObjectType[]>(availableOptions);

  const [selectedBlockType, setSelectedBlockType] = useState<blockObjectType>(
    availableOptions[0]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={classNames(s.promptBar)}
    >
      <div
        className={classNames(s.promptBar)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleGeneratePrompt({
              name: selectedBlockType.name,
              apiKey: selectedBlockType.apiKey,
              blockModelId: selectedBlockType.blockModelId,
              blockLevel: 0,
              availableBlocks: availableBlockTypesIds,
            });
          }
        }}
      >
        <TextField
          name="name"
          id="name"
          label=""
          value={prompt}
          placeholder="Write a prompt"
          onChange={(newValue) => setPrompt(newValue)}
        />
      </div>

      <div className={classNames(s.dropdown)}>
        <Dropdown
          renderTrigger={({ open, onClick }) => (
            <Button
              onClick={onClick}
              rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
            >
              {selectedBlockType?.name || 'Select a block type'}
            </Button>
          )}
        >
          <DropdownMenu>
            {availableOptions.map((blockType) => {
              return (
                <DropdownOption
                  key={blockType.apiKey}
                  onClick={() => {
                    setSelectedBlockType(blockType);
                  }}
                >
                  {blockType.name}
                </DropdownOption>
              );
            })}
          </DropdownMenu>
        </Dropdown>
      </div>

      <Button
        onClick={() => {
          handleGeneratePrompt({
            name: selectedBlockType.name,
            apiKey: selectedBlockType.apiKey,
            blockModelId: selectedBlockType.blockModelId,
            blockLevel: 0,
            availableBlocks: availableBlockTypesIds,
          });
        }}
        buttonSize="xxs"
        buttonType="muted"
      >
        Prompt
      </Button>
    </motion.div>
  );
};

export default ModularContentPrompting;
