class rgb {
    r;
    g;
    b;

    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     */
    constructor(r, g, b) {
        this.r = r || 0;
        this.g = g || 0;
        this.b = b || 0;
    }

    /**
     * @param {string} hex
     * @return {rgb|null}
     */
    static parseHex(hex) {
        const result = /^#?([a-f\d]{1,2})([a-f\d]{1,2})([a-f\d]{1,2})$/i.exec(hex);
        return result ? new rgb(
            Number.parseInt(result[1].length > 1 ? result[1] : result[1] + result[1], 16),
            Number.parseInt(result[2].length > 1 ? result[2] : result[2] + result[2], 16),
            Number.parseInt(result[3].length > 1 ? result[3] : result[3] + result[3], 16)
        ) : null;
    }

    /**
     * @return {string}
     */
    toHex() {
        return '#' + ((this.r * 65536) + (this.g * 256) + this.b).toString(16).padStart(6, '0');
    }

    /**
     * @return {string}
     */
    getTextColor() {
        if (this.toLab().L < 50) {
            return 'white';
        } else {
            return 'black';
        }
    }

    /**
     * @returns {labcolor}
     */
    toLab() {
        // See http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
        let r = this.r / 255, g = this.g / 255, b = this.b / 255, x, y, z;
        r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
        y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
        z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
        x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
        y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
        z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;
        return new labcolor((116 * y) - 16, 500 * (x - y), 200 * (y - z));
    }

    /**
     * @returns {hsv}
     */
    toHSV() {
        let h;
        let s;

        const max = Math.max(this.r, this.g, this.b);
        const diff = (max - Math.min(this.r, this.g, this.b)) / 255;
        const diff_c = function (c) {
            return (max - c / 255) / 6 / diff + 1 / 2;
        };

        if (diff === 0) {
            h = 0;
            s = 0;
        } else {
            s = diff / max;
            let r_diff = diff_c(this.r);
            let g_diff = diff_c(this.g);
            let b_diff = diff_c(this.b);

            if (this.r === max) {
                h = b_diff - g_diff;
            } else if (this.g === max) {
                h = (1 / 3) + r_diff - b_diff;
            } else if (this.b === max) {
                h = (2 / 3) + g_diff - r_diff;
            }

            if (h < 0) {
                h += 1;
            } else if (h > 1) {
                h -= 1;
            }
        }

        return new hsv(
            h * 360,
            s * 100 * 255,
            max * 100 / 255
        );
    }
}

class hsv {
    h;
    s;
    v;

    constructor(h, s, v) {
        this.h = h || 0;
        this.s = s || 0;
        this.v = v || 0;
    }
}

class labcolor {
    L;
    a;
    b;

    constructor(L, a, b) {
        this.L = L || 0;
        this.a = a || 0;
        this.b = b || 0;
    }
}

class Color {

    /**
     * @param {rgb} color1
     * @param {rgb} color2
     * @return {number}
     */
    static getLabDiff(color1, color2) {
        const c1 = color1.toLab();
        const c2 = color2.toLab();
        return Math.pow(c2.L - c1.L, 2) + Math.pow(c2.a - c1.a, 2) + Math.pow(c2.b - c1.b, 2);
    }

    /**
     * @param {rgb} color1
     * @param {rgb} color2
     * @return {number}
     */
    static getEuclideanDistance(color1, color2) {
        return (
            Math.pow(color1.r - color2.r, 2) +
            Math.pow(color1.g - color2.g, 2) +
            Math.pow(color1.b - color2.b, 2)
        );
    }

}


class ColorMatcher {
    _debug;
    dataset;
    colors;
    colors_b = [];
    blend = false;
    method;
    color;

    constructor(args) {
        this._debug = args.debug || false;
        this.updateDataset();
    }

    updateDataset() {
        const selected_dataset = document.querySelector("select[name=dataset]").value;
        if (this.dataset !== selected_dataset) {
            this.dataset = selected_dataset;
            this.colors = $.extend(true, [], THREAD_COLORS[selected_dataset]);
        }
    }

    setColorInput() {
        const hex_str = this.color.toHex().toUpperCase();
        document.getElementById('hex').value = hex_str;
        document.getElementById('hex').style.backgroundColor = hex_str;
        document.getElementById('hex').style.color = this.color.getTextColor();

        document.getElementById('r').value = this.color.r;
        document.getElementById('g').value = this.color.g;
        document.getElementById('b').value = this.color.b;
    }

    parseInputColor(color_type, value) {
        this.updateDataset();

        switch (color_type) {
            case 'rgb': {
                if (value[0] !== '' && value[1] !== '' && value[2] !== '') {
                    this.color = new rgb(Number.parseInt(value[0]), Number.parseInt(value[1]), Number.parseInt(value[2]));
                    this.setColorInput();
                }
                break;
            }
            case 'hex': {
                if (value !== '') {
                    this.color = rgb.parseHex(value);
                    if (this.color) this.setColorInput();
                    return;
                }
                break;
            }
            case 'color_code': {
                if (value !== '') {
                    let index = null;
                    for (let i = 0; i < THREAD_COLORS[this.dataset].length; i++) {
                        if (this.colors[i][0] === value) {
                            index = i;
                            break;
                        }
                    }
                    if (index != null) {
                        this.color = this.colors[index][3];
                        this.setColorInput();
                        return;
                    }
                }
                break;
            }
        }
    }

    render() {
        const tbody = document.getElementById('matches');
        tbody.innerHTML = '';

        const text_color = this.color.getTextColor();
        const hex_blended = this.color.toHex().toUpperCase();

        let tr = document.createElement('tr');

        const col1 = document.createElement('td');
        col1.rowSpan = 30;
        col1.classList.add('color');
        col1.style.cssText = `color: ${text_color}; background-color: ${hex_blended}`;
        let span = document.createElement('span');
        span.style.cssText = `background-color: ${hex_blended};`;
        span.innerText = hex_blended;
        col1.append(span);
        tr.append(col1);

        for (let i = 0; i < 20; i++) {

            if (i > 0) {
                tr = document.createElement('tr');
            }

            if (this.blend) {
                const text_color = this.colors_b[i][3].getTextColor();
                const hex1 = this.colors_b[i][1][3].toHex();
                const hex2 = this.colors_b[i][2][3].toHex();
                const hex_blended = this.colors_b[i][3].toHex().toUpperCase();

                // Checkerboard
                const col2 = document.createElement('td');
                col2.classList.add('match', 'blend');
                col2.style.cssText = `
                    background-image:
                        linear-gradient(45deg, ${hex1} 25%, transparent 25%, transparent 75%, ${hex1} 0),
                        linear-gradient(45deg, ${hex1} 25%, transparent 25%, transparent 75%, ${hex1} 0),
                        linear-gradient(135deg, ${hex2} 25%, transparent 25%, transparent 75%, ${hex2} 0),
                        linear-gradient(135deg, ${hex2} 25%, transparent 25%, transparent 75%, ${hex2} 0);
                `;
                // Blended color
                const span = document.createElement('span');
                span.classList.add('match', 'blend');
                span.style.cssText = `color: ${text_color}; background-color: ${hex_blended};`;
                span.innerText = hex_blended;
                if (this._debug) {
                    const span_debug = document.createElement('span');
                    span_debug.classList.add('debug');
                    span_debug.innerText = this.colors[i][4].toFixed(2);
                    span.append(span_debug);
                }
                col2.append(span);
                tr.append(col2);

                // DMC Color Codes
                const col3 = document.createElement('td');
                col3.innerText = this.colors_b[i][1][0] + ', ' + this.colors_b[i][2][0];
                tr.append(col3);

                // DMC Color Names
                const col4 = document.createElement('td');
                const span2 = document.createElement('span');
                span2.classList.add('float-left');
                span2.innerHTML = this.colors_b[i][1][1] + ',&nbsp;';
                const span3 = document.createElement('span');
                span3.classList.add('float-left');
                span3.innerText = this.colors_b[i][2][1];
                col4.append(span2, span3);
                tr.append(col4);

            } else {

                let text_color;
                const hex = this.colors[i][3].toHex().toUpperCase();
                if (this.colors[i][3].toLab().L < 50) {
                    text_color = 'white';
                } else {
                    text_color = 'black';
                }

                const col2 = document.createElement('td');
                col2.classList.add('match');
                col2.style.cssText = `color: ${text_color}; background-color: ${hex}`;
                const span = document.createElement('span');
                span.style.cssText = `background-color: ${hex};`;
                span.innerText = hex;
                if (this._debug) {
                    const span_debug = document.createElement('span');
                    span_debug.classList.add('debug');
                    span_debug.innerText = this.colors[i][4].toFixed(2);
                    span.append(span_debug);
                }
                col2.append(span);
                tr.append(col2);

                const col3 = document.createElement('td');
                col3.innerText = this.colors[i][0];
                tr.append(col3);

                const col4 = document.createElement('td');
                col4.innerText = this.colors[i][1];
                tr.append(col4);

            }
            tbody.append(tr);
        }
    }

    /**
     * @param {array} a1
     * @param {array} a2
     */
    static sortDiff(a1, a2) {
        if (Number.isNaN(a1[4]) || Number.isNaN(a2[4])) {
            return -1;
        }
        if (a1[4] === a2[4]) {
            return 0;
        } else {
            return (a1[4] < a2[4]) ? -1 : 1;
        }
    }

    sortClosestDeltaE() {
        for (let i = 0; i < this.colors.length; i++) {
            this.colors[i][4] = ciede2000(this.color.toLab(), this.colors[i][3].toLab());
        }
        this.colors.sort(ColorMatcher.sortDiff);
    };

    // https://www.compuphase.com/cmetric.htm
    sortClosestCompuPhase() {
        for (let i = 0; i < this.colors.length; i++) {
            const rmean = (this.color.r + this.colors[i][3].r) / 2;
            const r = this.color.r - this.colors[i][3].r;
            const g = this.color.g - this.colors[i][3].g;
            const b = this.color.b - this.colors[i][3].b;
            this.colors[i][4] = Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
            // this.colors[i][4] = Math.sqrt(
            //     (2 + (rmean / 256)) *
            //     Math.pow(Math.abs(r), 2) +
            //     4 *
            //     Math.pow(Math.abs(g), 2) +
            //     (2 + ((255 - rmean) / 256) ) *
            //     Math.pow(Math.abs(b), 2)
            // );
        }
        this.colors.sort(ColorMatcher.sortDiff);
    };

    sortClosestPerceptive() {
        for (let i = 0; i < this.colors.length; i++) {
            this.colors[i][4] = (
                Math.pow((this.color.r - this.colors[i][3].r) * 0.30, 2) +
                Math.pow((this.color.g - this.colors[i][3].g) * 0.59, 2) +
                Math.pow((this.color.b - this.colors[i][3].b) * 0.11, 2)
            );
        }
        this.colors.sort(ColorMatcher.sortDiff);
    }

    sortClosestEuclideanDistance() {
        for (let i = 0; i < this.colors.length; i++) {
            this.colors[i][4] = Color.getEuclideanDistance(this.color, this.colors[i][3]);
        }
        this.colors.sort(ColorMatcher.sortDiff);
    }

    sortClosestLab() {
        for (let i = 0; i < this.colors.length; i++) {
            this.colors[i][4] = Color.getLabDiff(this.color, this.colors[i][3]);
        }
        this.colors.sort(ColorMatcher.sortDiff);
    }

    sortColors() {
        switch (this.method) {
            case 0: {
                this.sortClosestDeltaE();
                break;
            }
            case 1: {
                this.sortClosestCompuPhase();
                break;
            }
            case 2: {
                this.sortClosestPerceptive();
                break;
            }
            case 3: {
                this.sortClosestEuclideanDistance();
                break;
            }
            case 4: {
                this.sortClosestLab();
                break;
            }
            default: {
                break;
            }
        }
    }

    /**
     * @param {number} method
     * @param {string} color_type
     * @param {string|array} color_value
     * @return {void}
     */
    find(method, color_type, color_value) {
        this.method = method;
        this.parseInputColor(color_type, color_value);
        if (this.color) {
            this.sortColors();
            this.render();
        }
    }

    /**
     * @param {number} method
     * @param {string} color_type
     * @param {string|array} color_value
     * @return {void}
     */
    find2(method, color_type, color_value) {
        this.method = method;
        this.parseInputColor(color_type, color_value);
        if (!this.color) {
            return;
        }

        // Blend every color combo
        this.colors_b = [];
        for (let i = 0; i < this.colors.length; i++) {
            for (let j = i; j < this.colors.length; j++) {
                // Find average color
                const blended = new rgb(
                    Math.round((this.colors[i][3].r + this.colors[j][3].r) / 2),
                    Math.round((this.colors[i][3].g + this.colors[j][3].g) / 2),
                    Math.round((this.colors[i][3].b + this.colors[j][3].b) / 2)
                );
                // Sort by name
                this.colors[i][1] < this.colors[j][1] ?
                    this.colors_b.push([null, this.colors[i], this.colors[j], blended, 0]) :
                    this.colors_b.push([null, this.colors[j], this.colors[i], blended, 0]);
            }
        }

        // Sort blended colors
        this.colors = this.colors_b;
        this.sortColors();
        this.colors_b = this.colors;

        this.blend = true;
        this.render();
        this.blend = false;
        this.colors = $.extend(true, [], THREAD_COLORS[this.dataset]);
    };
}
