import { WxTileSource } from '../../index';

// // Leaflet
// const timeControl = new WxTimeControl();
// 	map.addControl(new (L.Control.extend(timeControl.extender()))({ position: 'topright' }));

// // MBox
// const timeControl = new WxTimeControl();
// map.addControl(timeControl, 'top-right');

export class WxTimeControl {
	private readonly _div: HTMLDivElement;
	private readonly buttonPlayStop: HTMLButtonElement;
	private readonly timesEl: HTMLSelectElement;
	onchange: (time: string) => void = () => {};
	constructor(public readonly delay: number, private wxsource?: WxTileSource) {
		const div = document.createElement('div');
		div.className = 'mapboxgl-ctrl leaflet-control';
		div.style.borderStyle = 'solid';
		div.style.borderColor = '#000';
		div.style.backgroundColor = '#aaaaaaaa';
		div.style.padding = '5px';
		div.style.display = 'flex';
		div.style.flexDirection = 'column';
		this._div = div;
		div.innerText = 'Time animation';
		this.buttonPlayStop = document.createElement('button');
		div.appendChild(this.buttonPlayStop);
		this.timesEl = document.createElement('select');
		div.appendChild(this.timesEl);
		this.timesEl.onchange = async () => {
			if (this.timesEl.style.backgroundColor === 'yellow') return;
			this.timesEl.style.backgroundColor = 'yellow';
			this.timesEl.value = (await this.wxsource?.setTime(this.timesEl.value)) || '';
			this.onchange(this.timesEl.value);
			this.timesEl.style.backgroundColor = 'white';
		};

		this.wxsource && this.updateSource(this.wxsource);

		this.buttonPlayStop.innerHTML = 'Start';
		let t = 0;
		const holder = { abortController: new AbortController() };

		this.buttonPlayStop.onclick = async () => {
			if (this.buttonPlayStop.innerHTML === 'Start') {
				this.buttonPlayStop.innerHTML = 'Stop'; // change button text
				const nextTimeStep = async () => {
					// recursive time steps renderer function
					if (!this.wxsource) return;
					this.timesEl.style.backgroundColor = 'yellow';
					if (this.buttonPlayStop.innerHTML === 'Stop') {
						const nextTimeIndex = t++ % this.wxsource.getAllTimes().length;
						await this.wxsource.setTime(nextTimeIndex, holder.abortController);
						setTimeout(nextTimeStep, this.delay);
					} else {
						await this.wxsource.unsetCoarseLevel();
					}

					this.timesEl.value = this.wxsource.getTime() || '';
					this.onchange(this.timesEl.value);
					this.timesEl.style.backgroundColor = 'white';
				};

				await this.wxsource?.setCoarseLevel(2);
				nextTimeStep();
			} else {
				holder.abortController.abort();
				holder.abortController = new AbortController(); // recreate new abort controller
				this.buttonPlayStop.innerHTML = 'Start';
			}
		};
	}

	setTimes(times: string[]) {
		this.timesEl.options.length = 0;
		// fill this.timesEl with values from times
		for (let i = 0; i < times.length; i++) {
			const option = document.createElement('option');
			option.value = times[i];
			option.text = times[i];
			this.timesEl.appendChild(option);
		}

		this.onchange(this.timesEl.value);
	}

	updateSource(wxsource?: WxTileSource) {
		this.buttonPlayStop.innerHTML = 'Start'; // stop time animation
		this.wxsource = wxsource;
		const times = this.wxsource?.getAllTimes() || [];
		this.setTimes(times);
		this.timesEl.value = this.wxsource?.getTime() || '';
		this.onchange(this.timesEl.value);
		wxsource?.on('changed', () => this.updateSource(wxsource));
	}

	onAdd(/* map */) {
		return this._div;
	}

	onRemove() {
		this._div.parentNode?.removeChild(this._div);
	}

	// for Leaflet
	extender() {
		return { onAdd: () => this.onAdd(), onRemove: () => this.onRemove() };
	}
}
