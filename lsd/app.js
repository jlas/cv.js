let imageSelect;
let source;
let sourceCtx;
let target;
let targetCtx;
let image;
let reduction = 1;

/**
 * Calculate eigenvalues of 2x2 matrix
 * Ref: https://en.wikipedia.org/wiki/Eigenvalue_algorithm#2%C3%972_matrices
 */
function eigen2x2(mat) {
    let tr = mat[0][0] + mat[1][1];
    let det = mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
    let disc_root = Math.sqrt(tr ** 2 - 4 * det);
    let e1 = (tr - disc_root) / 2;
    let e2 = (tr + disc_root) / 2;
    //console.log(e1, e2);
    return [e1, e2];
}

/**
 * Calculate the scalar projection and rejection of vector a onto b
 */
function scalar_projections(a, b) {
    let a1 = math.dot(a, math.divide(b, math.norm(b)));
    let a2 = math.subtract(a, a1);
    return [math.norm(a1), math.norm(a2)];
}

function rect(region, magnitude) {
    let mag = 0;
    let mag_x = 0;
    let mag_y = 0;

    for (let pixel of region) {
        let row = Math.floor(pixel / source.width);
        let col = pixel - row * source.width;

        mag += magnitude[pixel];
        mag_x += magnitude[pixel] * col;
        mag_y += magnitude[pixel] * row;
    }

    let cx = mag_x / mag;
    let cy = mag_y / mag;

    let mxx = 0;
    let mxy = 0;
    let myy = 0;

    for (let pixel of region) {
        let row = Math.floor(pixel / source.width);
        let col = pixel - row * source.width;

        mxx += magnitude[pixel] * (col - cx) ** 2;
        mxy += magnitude[pixel] * (col - cx) * (row - cy);
        myy += magnitude[pixel] * (row - cy) ** 2;
    }

    mxx /= mag;
    mxy /= mag;
    myy /= mag;

    let e = Math.min(...eigen2x2([[mxx, mxy], [mxy, myy]]));
    // http://math.colgate.edu/~wweckesser/math312Spring06/handouts/IMM_2x2linalg.pdf
    let v;
    if (mxy === 0 && mxx - e === 0) {
        v = [myy - e, -mxy];
    } else {
        v = [-mxy, mxx - e];
    }

    // Find max distance from lines intersecting at the rectangle center point.
    let parmax = -Infinity;
    let orthmax = -Infinity;
    for (let pixel of region) {
        let row = Math.floor(pixel / source.width);
        let col = pixel - row * source.width;
        let [par, orth] = scalar_projections([col - cx, row - cy], v);
        parmax = Math.max(parmax, par);
        orthmax = Math.max(orthmax, orth);
    }

    // Find all pixels inside the rectangle. Iterate through pixels as if the
    // rectangle had 0 rotation since that is easier. Then apply rotation
    // transform to find true pixel locations.
    let newregion = [];
    let angle = Math.atan(v[1] / v[0]);
    let rotation = [
        [Math.cos(-angle), -Math.sin(-angle)],
        [Math.sin(-angle), Math.cos(-angle)]
    ];
    for (let x = -parmax; x < parmax; x++) {
        for (let y = -orthmax; y < orthmax; y++) {
            let [_x, _y] = math.multiply([x, y], rotation);
            _x += cx;
            _y += cy;
            newregion.push([_x, _y]);
        }
    }

    return [cx, cy, newregion];
}

/**
 * Return the 8-connected neighborhood of pixel in row-major form
 * @param {number} pixel - pixel index in row major
 */
function neighborhood(pixel) {
    console.assert(pixel >= 0);
    let [h, w] = [source.height, source.width];
    let row = Math.floor(pixel / w);
    let col = pixel - row * w;
    if (row === 0 && col === 0) {
        return [pixel + 1, pixel + w, pixel + w + 1];
    } else if (row === h - 1 && col === 0) {
        return [pixel - w, pixel - w + 1, pixel + 1];
    } else if (row === h - 1 && col === w - 1) {
        return [pixel - w - 1, pixel - w, pixel - 1];
    } else if (row === 0 && col === w - 1) {
        return [pixel - 1, pixel + w - 1, pixel + w + 1];
    } else if (row === 0) {
        return [pixel - 1, pixel + 1, pixel + w - 1, pixel + w, pixel + w + 1];
    } else if (row === h - 1) {
        return [pixel - w - 1, pixel - w, pixel - w + 1, pixel - 1, pixel + 1];
    } else if (col === 0) {
        return [pixel - w, pixel - w + 1, pixel + 1, pixel + w, pixel + w + 1];
    } else if (col === w - 1) {
        return [pixel - w - 1, pixel - w, pixel - 1, pixel + w - 1, pixel + w];
    }
    return [
        pixel - w - 1,
        pixel - w,
        pixel - w + 1,
        pixel - 1,
        pixel + 1,
        pixel + w - 1,
        pixel + w,
        pixel + w + 1
    ];
}

/**
 * @param {number[]} angle
 * @param {number} seed - starting pixel
 * @param {number} tolerance
 * @param {bool[]} status - pixel used if true
 */
function region(angle, seed, tolerance, status) {
    let region = [seed];
    let theta = angle[seed];
    let sx = Math.cos(theta);
    let sy = Math.sin(theta);
    for (let i = 0; i < region.length; i++) {
        for (let pixel of neighborhood(region[i])) {
            if (status[pixel]) {
                continue;
            }
            if (Math.abs(angle[pixel] - theta) >= tolerance) {
                continue;
            }
            region.push(pixel);
            status[pixel] = true;
            sx += Math.cos(angle[pixel]);
            sy += Math.sin(angle[pixel]);
            theta = Math.atan(sy / sx);
        }
    }
    return region;
}

function gradient() {
    let imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
    let width = imageData.width;
    let height = imageData.height;

    let gx = new Uint8ClampedArray(width * height);
    let gy = new Uint8ClampedArray(width * height);

    let d = imageData.data;

    for (let y = 0; y < height; y += 1) {
        let y0 = y * width * 4;
        let y1 = (y + 1) * width * 4;
        for (let x = 0; x < width; x += 1) {
            let y0x0 = y0 + x * 4;
            let y0x1 = y0 + (x + 1) * 4;
            let y1x0 = y1 + x * 4;
            let y1x1 = y1 + (x + 1) * 4;
            let _gx = (d[y0x1] + d[y1x1] - d[y0x0] - d[y1x0]) / 2;
            gx[y * width + x] = _gx;
            let _gy = (d[y1x0] + d[y1x1] - d[y0x0] - d[y0x1]) / 2;
            gy[y * width + x] = _gy;
        }
    }

    let angle = new Float64Array(width * height);
    let magnitude = new Uint8ClampedArray(width * height);
    for (let i = 0; i < width * height; i++) {
        // Use 0 as default otherwise angle can be NaN
        angle[i] = Math.atan(gx[i] / -gy[i]) || 0;
        magnitude[i] = Math.sqrt(gx[i] ** 2 + gy[i] ** 2);
    }

    return {
        angle,
        magnitude
    };
}

function lsd() {
    let { angle, magnitude } = gradient();
    let len = source.width * source.height;
    let status = new Array(len).fill(false);
    let regions = [];
    let tau = Math.PI / 8;
    let q = 2;
    let threshold = q / Math.sin(tau);
    for (let i = 0; i < len; i++) {
        if (magnitude[i] <= threshold) status[i] = true;
    }
    for (let row = 1; row < source.height - 1; row++) {
        for (let col = 1; col < source.width - 1; col++) {
            let i = row * col;
            if (status[i] === false) {
                status[i] = true;
                regions.push(region(angle, i, tau, status));
            }
        }
    }

    let newImage = targetCtx.createImageData(target.width, target.height);
    let src = magnitude;
    for (let i = 0, j = 0; i < newImage.data.length; i += 4, j += 1) {
        newImage.data[i] = src[j];
        newImage.data[i + 1] = src[j];
        newImage.data[i + 2] = src[j];
        newImage.data[i + 3] = src[j];
    }
    let i = 0;
    for (let region of regions
        .sort((a, b) => (a.length > b.length ? -1 : 1))
        .slice(0)) {
        let [_r, _g, _b] = [
            Math.random() * 255,
            Math.random() * 255,
            Math.random() * 255
        ];
        for (let r of region) {
            newImage.data[r * 4] = _r;
            newImage.data[r * 4 + 1] = _g;
            newImage.data[r * 4 + 2] = _b;
            newImage.data[r * 4 + 3] = 127;
        }
        i = (i + 1) % 3;

        let [cx, cy, newregion] = rect(region, magnitude);
        cx = Math.round(cx);
        cy = Math.round(cy);
        _r = cy * source.width * 4 + cx * 4;
        newImage.data[_r] = 255;
        newImage.data[_r + 1] = 0;
        newImage.data[_r + 2] = 0;
        newImage.data[_r + 3] = 255;
        for (let [x, y] of newregion) {
            let r = Math.round(y) * source.width * 4 + Math.round(x) * 4;
            newImage.data[r] = _r;
            newImage.data[r + 1] = _g;
            newImage.data[r + 2] = _b;
            newImage.data[r + 3] = 127;
        }
    }
    targetCtx.putImageData(newImage, 0, 0);
    return {
        angle,
        magnitude
    };
}

// Handle user drop down selection
function changeImage() {
    image.src = "/images/" + imageSelect.value;
}

// Triggered on image load
function initImage() {
    let {
        width: bodyWidth,
        height: bodyHeight
    } = document.body.getBoundingClientRect();
    let targetWidth = image.width;
    let targetHeight = image.height;
    reduction = 1;
    if (image.width > 0.5 * bodyWidth) {
        // Scale down the image to fit in the user's browser
        targetWidth = Math.floor(0.5 * bodyWidth);
        reduction = targetWidth / image.width;
        targetHeight = reduction * image.height;
    }
    source.width = targetWidth;
    source.height = targetHeight;
    sourceCtx.clearRect(0, 0, source.width, source.height);
    sourceCtx.drawImage(image, 0, 0, targetWidth, targetHeight);
    target.width = targetWidth;
    target.height = targetHeight;

    requestIdleCallback(lsd);
}

// Initialize application
function init() {
    imageSelect = document.getElementById("image-select");
    imageSelect.onchange = changeImage;
    source = document.getElementById("source");
    sourceCtx = source.getContext("2d");
    target = document.getElementById("target");
    targetCtx = target.getContext("2d");
    image = document.getElementById("source-img");
    image.onload = initImage;
    changeImage();
}

window.onload = init;
