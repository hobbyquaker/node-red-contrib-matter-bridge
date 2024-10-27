const ColorConverter = {
    getGamutRanges() {
        const gamutA = {
            red: [0.704, 0.296],
            green: [0.2151, 0.7106],
            blue: [0.138, 0.08],
        };

        const gamutB = {
            red: [0.675, 0.322],
            green: [0.409, 0.518],
            blue: [0.167, 0.04],
        };

        const gamutC = {
            red: [0.692, 0.308],
            green: [0.17, 0.7],
            blue: [0.153, 0.048],
        };

        const defaultGamut = {
            red: [1, 0],
            green: [0, 1],
            blue: [0, 0],
        };

        return {
            gamutA, gamutB, gamutC, default: defaultGamut,
        };
    },

    getLightColorGamutRange(modelId = null) {
        const ranges = ColorConverter.getGamutRanges();
        const {gamutA} = ranges;
        const {gamutB} = ranges;
        const {gamutC} = ranges;

        const models = {
            a: gamutA,
            b: gamutB,
            c: gamutC,
        };

        if (models[modelId]) {
            return models[modelId];
        }

        return ranges.default;
    },

    rgbToXy(red, green, blue, modelId = null) {
        function getGammaCorrectedValue(value) {
            return (value > 0.040_45) ? ((value + 0.055) / (1 + 0.055)) ** 2.4 : (value / 12.92);
        }

        const colorGamut = ColorConverter.getLightColorGamutRange(modelId);

        red = Number.parseFloat(red / 255);
        green = Number.parseFloat(green / 255);
        blue = Number.parseFloat(blue / 255);

        red = getGammaCorrectedValue(red);
        green = getGammaCorrectedValue(green);
        blue = getGammaCorrectedValue(blue);

        const x = red * 0.649_926 + green * 0.103_455 + blue * 0.197_109;
        const y = red * 0.234_327 + green * 0.743_075 + blue * 0.022_598;
        const z = red * 0 + green * 0.053_077 + blue * 1.035_763;

        let xy = {
            x: x / (x + y + z),
            y: y / (x + y + z),
        };

        if (!ColorConverter.xyIsInGamutRange(xy, colorGamut)) {
            xy = ColorConverter.getClosestColor(xy, colorGamut);
        }

        return xy;
    },

    xyIsInGamutRange(xy, gamut) {
        gamut ||= ColorConverter.getGamutRanges().gamutC;
        if (Array.isArray(xy)) {
            xy = {
                x: xy[0],
                y: xy[1],
            };
        }

        const v0 = [gamut.blue[0] - gamut.red[0], gamut.blue[1] - gamut.red[1]];
        const v1 = [gamut.green[0] - gamut.red[0], gamut.green[1] - gamut.red[1]];
        const v2 = [xy.x - gamut.red[0], xy.y - gamut.red[1]];

        const dot00 = (v0[0] * v0[0]) + (v0[1] * v0[1]);
        const dot01 = (v0[0] * v1[0]) + (v0[1] * v1[1]);
        const dot02 = (v0[0] * v2[0]) + (v0[1] * v2[1]);
        const dot11 = (v1[0] * v1[0]) + (v1[1] * v1[1]);
        const dot12 = (v1[0] * v2[0]) + (v1[1] * v2[1]);

        const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);

        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

        return ((u >= 0) && (v >= 0) && (u + v < 1));
    },

    getClosestColor(xy, gamut) {
        function getLineDistance(pointA, pointB) {
            return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
        }

        function getClosestPoint(xy, pointA, pointB) {
            const xy2a = [xy.x - pointA.x, xy.y - pointA.y];
            const a2b = [pointB.x - pointA.x, pointB.y - pointA.y];
            const a2bSqr = a2b[0] ** 2 + a2b[1] ** 2;
            const xy2a_dot_a2b = xy2a[0] * a2b[0] + xy2a[1] * a2b[1];
            const t = xy2a_dot_a2b / a2bSqr;

            return {
                x: pointA.x + a2b[0] * t,
                y: pointA.y + a2b[1] * t,
            };
        }

        const greenBlue = {
            a: {
                x: gamut.green[0],
                y: gamut.green[1],
            },
            b: {
                x: gamut.blue[0],
                y: gamut.blue[1],
            },
        };

        const greenRed = {
            a: {
                x: gamut.green[0],
                y: gamut.green[1],
            },
            b: {
                x: gamut.red[0],
                y: gamut.red[1],
            },
        };

        const blueRed = {
            a: {
                x: gamut.red[0],
                y: gamut.red[1],
            },
            b: {
                x: gamut.blue[0],
                y: gamut.blue[1],
            },
        };

        const closestColorPoints = {
            greenBlue: getClosestPoint(xy, greenBlue.a, greenBlue.b),
            greenRed: getClosestPoint(xy, greenRed.a, greenRed.b),
            blueRed: getClosestPoint(xy, blueRed.a, blueRed.b),
        };

        const distance = {
            greenBlue: getLineDistance(xy, closestColorPoints.greenBlue),
            greenRed: getLineDistance(xy, closestColorPoints.greenRed),
            blueRed: getLineDistance(xy, closestColorPoints.blueRed),
        };

        let closestDistance;
        let closestColor;
        for (const i in distance) {
            if (distance.hasOwnProperty(i)) {
                if (!closestDistance) {
                    closestDistance = distance[i];
                    closestColor = i;
                }

                if (closestDistance > distance[i]) {
                    closestDistance = distance[i];
                    closestColor = i;
                }
            }
        }

        return closestColorPoints[closestColor];
    },

    xyBriToRgb(x, y, bri) {
        function getReversedGammaCorrectedValue(value) {
            return value <= 0.003_130_8 ? 12.92 * value : (1 + 0.055) * value ** (1 / 2.4) - 0.055;
        }

        const z = 1 - x - y;
        const Y = bri / 255;
        const X = (Y / y) * x;
        const Z = (Y / y) * z;
        let r = X * 1.656_492 - Y * 0.354_851 - Z * 0.255_038;
        let g = -X * 0.707_196 + Y * 1.655_397 + Z * 0.036_152;
        let b = X * 0.051_713 - Y * 0.121_364 + Z * 1.011_53;

        r = getReversedGammaCorrectedValue(r);
        g = getReversedGammaCorrectedValue(g);
        b = getReversedGammaCorrectedValue(b);

        // Bring all negative components to zero
        r = Math.max(r, 0);
        g = Math.max(g, 0);
        b = Math.max(b, 0);

        // If one component is greater than 1, weight components by that value
        const max = Math.max(r, g, b);
        if (max > 1) {
		    r /= max;
		    g /= max;
		    b /= max;
        }

        return {
		    r: Math.floor(r * 255),
		    g: Math.floor(g * 255),
		    b: Math.floor(b * 255),
        };
    },
};
module.exports = {ColorConverter};
