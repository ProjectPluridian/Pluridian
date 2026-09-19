import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl, SuggestModal, TFolder } from 'obsidian';

interface PluridianSettings {
	headmatesFolder: string;
	messagingFolder: string;
	scriptsFolder: string;
	templatesFolder: string;
}

const DEFAULT_SETTINGS: PluridianSettings = {
	headmatesFolder: 'New System Management/Headmates/Headmate Homes',
	messagingFolder: 'New System Management/System Messaging',
	scriptsFolder: 'New System Management/Back End Management/Templates/Scripts',
	templatesFolder: 'New System Management/Back End Management/Templates'
};

const GITHUB_OWNER = 'ProjectPluridian';
const GITHUB_REPO = 'Pluridian';

const SETTINGS_FIELDS: { key: keyof PluridianSettings; label: string; desc: string }[] = [
	{ key: 'headmatesFolder', label: 'Headmates folder', desc: 'Where your headmate cards live.' },
	{ key: 'messagingFolder', label: 'Messaging folder', desc: 'Where threads and messages are stored.' },
	{ key: 'scriptsFolder', label: 'Scripts folder', desc: 'Where Pluridian scripts live.' },
	{ key: 'templatesFolder', label: 'Templates folder', desc: 'Where templates live.' }
];

export default class PluridianPlugin extends Plugin {
	settings!: PluridianSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new PluridianSettingTab(this.app, this));

		this.addCommand({
			id: 'pluridian-open-settings',
			name: 'Open Pluridian Settings',
			callback: () => {
				new PluridianSettingsModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'pluridian-check-for-updates',
			name: 'Check for Updates',
			callback: () => {
				new UpdateModal(this.app, this).open();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

function getAllFolderPaths(app: App): string[] {
	const folders: string[] = [''];
	const walk = (folder: TFolder) => {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				folders.push(child.path);
				walk(child);
			}
		}
	};
	walk(app.vault.getRoot());
	return folders.sort();
}

class FolderSuggestModal extends SuggestModal<string> {
	private onChoose_: (path: string) => void;
	private folders: string[];

	constructor(app: App, onChoose: (path: string) => void) {
		super(app);
		this.onChoose_ = onChoose;
		this.folders = getAllFolderPaths(app);
		this.setPlaceholder('Type to search folders...');
	}

	getSuggestions(query: string): string[] {
		const q = query.toLowerCase();
		return this.folders.filter(f => f.toLowerCase().includes(q));
	}

	renderSuggestion(folder: string, el: HTMLElement) {
		el.addClass('pluridian-folder-suggestion');
		el.setText(folder === '' ? '/ (vault root)' : folder);
	}

	onChooseSuggestion(folder: string) {
		this.onChoose_(folder);
	}
}

class FieldEditModal extends Modal {
	private fieldLabel: string;
	private currentValue: string;
	private onSave: (value: string) => void;

	constructor(app: App, fieldLabel: string, currentValue: string, onSave: (value: string) => void) {
		super(app);
		this.fieldLabel = fieldLabel;
		this.currentValue = currentValue;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('pluridian-field-edit-modal');
		contentEl.createEl('h2', { text: `Edit: ${this.fieldLabel}`, cls: 'pluridian-modal-title' });

		const textArea = contentEl.createEl('textarea', { cls: 'pluridian-field-textarea' });
		textArea.value = this.currentValue;
		textArea.rows = 3;

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Browse Folders...')
				.setClass('pluridian-browse-btn')
				.onClick(() => {
					new FolderSuggestModal(this.app, (chosenPath) => {
						textArea.value = chosenPath;
					}).open();
				}));

		const buttonRow = new Setting(contentEl).setClass('pluridian-modal-buttonrow');
		buttonRow
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => this.close()))
			.addButton(btn => btn
				.setButtonText('Save')
				.setCta()
				.onClick(() => {
					this.onSave(textArea.value.trim());
					this.close();
				}));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class PluridianSettingTab extends PluginSettingTab {
	plugin: PluridianPlugin;

	constructor(app: App, plugin: PluridianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.render();
	}

	render() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('pluridian-settings-tab');
		containerEl.createEl('h2', { text: 'Pluridian Settings', cls: 'pluridian-modal-title' });

		SETTINGS_FIELDS.forEach(field => {
			const setting = new Setting(containerEl)
				.setName(field.label)
				.setDesc(field.desc)
				.setClass('pluridian-settings-row');

			setting.controlEl.createEl('div', {
				text: this.plugin.settings[field.key] || '(empty)',
				cls: 'pluridian-path-preview'
			});

			setting.addButton(btn => btn
				.setButtonText('Edit')
				.setClass('pluridian-edit-button')
				.onClick(() => {
					new FieldEditModal(
						this.app,
						field.label,
						this.plugin.settings[field.key],
						async (newValue) => {
							this.plugin.settings[field.key] = newValue;
							await this.plugin.saveSettings();
							this.render();
						}
					).open();
				}));
		});
	}
}

class PluridianSettingsModal extends Modal {
	plugin: PluridianPlugin;

	constructor(app: App, plugin: PluridianPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		this.render();
	}

	render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('pluridian-settings-modal');
		contentEl.createEl('h2', { text: 'Pluridian Settings', cls: 'pluridian-modal-title' });

		SETTINGS_FIELDS.forEach(field => {
			const row = contentEl.createDiv({ cls: 'pluridian-settings-row' });

			row.createEl('div', { text: field.label, cls: 'pluridian-settings-label' });
			row.createEl('div', { text: field.desc, cls: 'pluridian-settings-desc' });
			row.createEl('div', {
				text: this.plugin.settings[field.key] || '(empty)',
				cls: 'pluridian-path-preview'
			});

			const editBtn = row.createEl('button', { text: 'Edit', cls: 'pluridian-edit-button' });
			editBtn.onclick = () => {
				new FieldEditModal(
					this.app,
					field.label,
					this.plugin.settings[field.key],
					async (newValue) => {
						this.plugin.settings[field.key] = newValue;
						await this.plugin.saveSettings();
						this.render();
					}
				).open();
			};
		});

		new Setting(contentEl)
			.setClass('pluridian-modal-buttonrow')
			.addButton(btn => btn
				.setButtonText('Close')
				.setCta()
				.onClick(() => this.close()));
	}

	onClose() {
		this.contentEl.empty();
	}
}

interface GithubRelease {
	tag_name: string;
	published_at: string;
	assets: { name: string; browser_download_url: string }[];
}

class UpdateModal extends Modal {
	plugin: PluridianPlugin;

	constructor(app: App, plugin: PluridianPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('pluridian-update-modal');
		contentEl.createEl('h2', { text: 'Pluridian Updates', cls: 'pluridian-modal-title' });
		const status = contentEl.createEl('p', { text: 'Checking for available versions...', cls: 'pluridian-status-text' });

		let releases: GithubRelease[];
		try {
			const response = await requestUrl({
				url: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
			});
			releases = response.json as GithubRelease[];
		} catch (e) {
			status.setText('Could not reach GitHub. Check your connection and try again.');
			return;
		}

		status.remove();

		if (!releases || releases.length === 0) {
			contentEl.createEl('p', { text: 'No published versions found yet.', cls: 'pluridian-status-text' });
			return;
		}

		contentEl.createEl('p', { text: `Currently installed: v${this.plugin.manifest.version}`, cls: 'pluridian-current-version' });

		const latest = releases[0]!;
		new Setting(contentEl)
			.setName(`Update to latest (${latest.tag_name})`)
			.setClass('pluridian-settings-row')
			.addButton(btn => btn
				.setButtonText('Update')
				.setCta()
				.onClick(() => this.installVersion(latest)));

		contentEl.createEl('h3', { text: 'Or choose a specific version:', cls: 'pluridian-subheading' });
		releases.forEach(release => {
			new Setting(contentEl)
				.setName(release.tag_name)
				.setDesc(new Date(release.published_at).toLocaleDateString())
				.setClass('pluridian-settings-row')
				.addButton(btn => btn
					.setButtonText('Install this version')
					.onClick(() => this.installVersion(release)));
		});

		new Setting(contentEl)
			.setClass('pluridian-modal-buttonrow')
			.addButton(btn => btn.setButtonText('Skip for now').onClick(() => this.close()));
	}

	async installVersion(release: GithubRelease) {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('p', { text: `Installing ${release.tag_name}...`, cls: 'pluridian-status-text' });

		try {
			const mainJsAsset = release.assets.find(a => a.name === 'main.js');
			const manifestAsset = release.assets.find(a => a.name === 'manifest.json');
			const stylesAsset = release.assets.find(a => a.name === 'styles.css');

			if (!mainJsAsset || !manifestAsset) {
				contentEl.createEl('p', { text: 'This release is missing required files.', cls: 'pluridian-status-text' });
				return;
			}

			const pluginDir = `${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

			const mainJs = await requestUrl({ url: mainJsAsset.browser_download_url });
			await this.app.vault.adapter.write(`${pluginDir}/main.js`, mainJs.text);

			const manifestJson = await requestUrl({ url: manifestAsset.browser_download_url });
			await this.app.vault.adapter.write(`${pluginDir}/manifest.json`, manifestJson.text);

			if (stylesAsset) {
				const stylesCss = await requestUrl({ url: stylesAsset.browser_download_url });
				await this.app.vault.adapter.write(`${pluginDir}/styles.css`, stylesCss.text);
			}

			new Notice(`Pluridian updated to ${release.tag_name}. Reloading...`);

			// @ts-ignore
			await this.app.plugins.disablePlugin(this.plugin.manifest.id);
			// @ts-ignore
			await this.app.plugins.enablePlugin(this.plugin.manifest.id);

			this.close();
		} catch (e) {
			contentEl.empty();
			contentEl.createEl('p', { text: 'Something went wrong installing that version. Nothing was changed.', cls: 'pluridian-status-text' });
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}