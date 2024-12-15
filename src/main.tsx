import {
  connect,
  type Field,
  type ItemType,
  type RenderFieldExtensionCtx,
  type RenderPageCtx,
  type RenderItemFormSidebarPanelCtx,
  type AssetSourcesCtx,
  type ItemFormSidebarPanelsCtx,
  type SettingsAreaSidebarItemGroupsCtx,
} from 'datocms-plugin-sdk';
import 'datocms-react-ui/styles.css';
import ConfigScreen, {
  type ctxParamsType,
} from './entrypoints/Config/ConfigScreen';
import { render } from './utils/render';
import DatoGPTPrompt from './entrypoints/Fields/DatoGPTPrompt';
import { Canvas } from 'datocms-react-ui';
import AssetBrowser from './entrypoints/Assets/AssetBrowser';
import PromptsConfig from './entrypoints/Config/PromptsConfig';
import DatoGPTTranslateSidebar from './entrypoints/Sidebar/DatoGPTTranslateSidebar';
import AdvancedSettings from './entrypoints/Config/AdvancedSettings';
import DatoGPTSidebar from './entrypoints/Sidebar/DatoGPTSidebar';

const openAIIcon =
  '<svg fill="#000000" role="img" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title>OpenAI icon</title><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"></path></g></svg>';

connect({
  //TODO: Consider onboot for pluginConfigs
  renderConfigScreen(ctx) {
    return render(<ConfigScreen ctx={ctx} />);
  },
  assetSources(ctx: AssetSourcesCtx) {
    const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

    if (!pluginParams.advancedSettings.mediaAreaPermissions) {
      return [];
    }

    return [
      {
        id: 'datogpt',
        name: 'DatoGPT',
        icon: {
          type: 'svg',
          viewBox: '0 0 24 24',
          content: openAIIcon,
        },
        modal: {
          width: 1200,
        },
      },
    ];
  },
  itemFormSidebarPanels(_model: ItemType, ctx: ItemFormSidebarPanelsCtx) {
    const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

    if (!pluginParams.advancedSettings.translateWholeRecord) {
      return [];
    }

    return [
      {
        id: 'datoGptGenerateSidebar',
        label: 'DatoGPT Generate',
        startOpen: false,
        placement: ['after', 'info'],
      },
      {
        id: 'datoGptTranslateSidebar',
        label: 'DatoGPT Translate',
        startOpen: false,
        placement: ['after', 'info'],
      },
    ];
  },
  renderItemFormSidebarPanel(
    sidebarPanelId,
    ctx: RenderItemFormSidebarPanelCtx
  ) {
    switch (sidebarPanelId) {
      case 'datoGptTranslateSidebar':
        if (
          Array.isArray(ctx.formValues.internalLocales) &&
          ctx.formValues.internalLocales.length > 1
        ) {
          return render(<DatoGPTTranslateSidebar ctx={ctx} />);
        }
        return render(
          <Canvas ctx={ctx}>
            <p>
              For the translate feature to work, you need to have more than one
              locale in this record.
            </p>
          </Canvas>
        );
      case 'datoGptGenerateSidebar':
        return render(<DatoGPTSidebar ctx={ctx} />);
      default:
        return null;
    }
  },
  renderAssetSource(_sourceId, ctx) {
    render(
      <Canvas ctx={ctx}>
        <AssetBrowser ctx={ctx} />
      </Canvas>
    );
  },
  overrideFieldExtensions(field: Field) {
    const fieldType = field.attributes.appearance.editor;

    if (
      !(
        fieldType === 'video' ||
        fieldType === 'link_select' ||
        fieldType === 'links_select' ||
        fieldType === 'link_embed'
      )
    )
      return {
        addons: [{ id: 'datoGptPrompt' }],
      };
  },
  renderFieldExtension(fieldExtensionId: string, ctx: RenderFieldExtensionCtx) {
    switch (fieldExtensionId) {
      case 'datoGptPrompt':
        return render(<DatoGPTPrompt ctx={ctx} />);
    }
  },
  settingsAreaSidebarItemGroups(ctx: SettingsAreaSidebarItemGroupsCtx) {
    if (!ctx.currentRole.attributes.can_edit_schema) {
      return [];
    }
    return [
      {
        label: 'DatoGPT',
        items: [
          {
            label: 'Advanced Settings',
            icon: 'cogs',
            pointsTo: {
              pageId: 'datogpt-advanced-settings',
            },
          },
          {
            label: 'Prompts',
            icon: 'typewriter',
            pointsTo: {
              pageId: 'datogpt-prompts',
            },
          },
        ],
      },
    ];
  },
  renderPage(pageId, ctx: RenderPageCtx) {
    switch (pageId) {
      case 'datogpt-prompts':
        return render(<PromptsConfig ctx={ctx} />);
      case 'datogpt-advanced-settings':
        return render(<AdvancedSettings ctx={ctx} />);
    }
  },
});
