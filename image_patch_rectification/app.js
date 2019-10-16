let source;
let sourceCtx;
let sourceFull;
let sourceFullCtx;
let target;
let targetCtx;
let overlay;
let rectifyBtn;
let image;
let imageUrl;
let coords = [];
let P = [];
let H;
let reduction = 1;

// lower-upper (LU) decomposition prepares a matrix for solving
// Taken from https://en.wikipedia.org/wiki/LU_decomposition#C_code_examples
function LUPDecompose(A, N, tol, P) {
    for (let i = 0; i <= N; i++) {
        P[i] = i;
    }

    for (let i = 0; i < N; i++) {
        let maxA = 0;
        let imax = i;

        for (let k = i; k < N; k++) {
            let absA = Math.abs(A[k][i]);
            if (absA > maxA) {
                maxA = absA;
                imax = k;
            }
        }

        if (maxA < tol) return 0;

        if (imax != i) {
            let j = P[i];
            P[i] = P[imax];
            P[imax] = j;

            let ptr = A[i];
            A[i] = A[imax];
            A[imax] = ptr;

            P[N]++;
        }

        for (let j = i + 1; j < N; j++) {
            A[j][i] /= A[i][i];

            for (let k = i + 1; k < N; k++) {
                A[j][k] -= A[j][i] * A[i][k];
            }
        }
    }
    return 1;
}

// Solve a system of linear equations, run LUPDecompose first
// Taken from https://en.wikipedia.org/wiki/LU_decomposition#C_code_examples
function LUPSolve(A, P, b, N, x) {
    for (let i = 0; i < N; i++) {
        x[i] = b[P[i]];
        for (let k = 0; k < i; k++) {
            x[i] -= A[i][k] * x[k];
        }
    }
    for (let i = N - 1; i >= 0; i--) {
        for (let k = i + 1; k < N; k++) {
            x[i] -= A[i][k] * x[k];
        }
        x[i] = x[i] / A[i][i];
    }
}

// Compute a homography from 4 sets of corresponding points
// Mathematical approach based on https://math.stackexchange.com/a/2619023
function solveHomography(coords1, coords2) {
    H = [[0, 0, 0, 0, 0, 0, 0, 0, 1]];
    for (let i = 0; i < 4; i += 1) {
        let [x, y] = coords1[i];
        let [xp, yp] = coords2[i];
        H.push([-x, -y, -1, 0, 0, 0, x * xp, y * xp, xp]);
        H.push([0, 0, 0, -x, -y, -1, x * yp, y * yp, yp]);
    }
    let b = [1, 0, 0, 0, 0, 0, 0, 0, 0];
    let x = [];
    P = [];
    LUPDecompose(H, 9, -1e5, P);
    LUPSolve(H, P, b, 9, x);
    H = [[x[0], x[1], x[2]], [x[3], x[4], x[5]], [x[6], x[7], x[8]]];
    P = [];
    LUPDecompose(H, 3, -1e5, P);
}

// Compute Euclidean distance
function dist(c1, c2) {
    let [x1, y1] = c1;
    let [x2, y2] = c2;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Find the minimum width and height of the quadrilateral formed by the input coordinates
function findMinDims(_coords) {
    let imin = 0;
    let dmin = Infinity;
    for (let i = 1; i < _coords.length; i++) {
        let d = dist(_coords[i - 1], _coords[i]);
        if (d < dmin) {
            dmin = d;
            imin = i;
        }
    }
    let d1 = dist(_coords[(2 + imin) % 4], _coords[imin - 1]);
    let d2 = dist(_coords[imin], _coords[(imin + 1) % 4]);

    // Width was minimum
    if (imin == 1 || imin == 3) return [dmin, Math.min(d1, d2)];

    // Height was minimum
    return [Math.min(d1, d2), dmin];
}

// Handle user click on Rectify button
// - calculate homography
// - apply projective transformation
function handleRectify() {
    if (coords.length < 4) alert("Select 4 points!");
    let [w, h] = findMinDims(coords);

    // Back-out any reduction to apply homography to full-size image
    w = Math.floor(w / reduction);
    h = Math.floor(h / reduction);
    let _coords = coords.map(c => [
        Math.floor(c[0] / reduction),
        Math.floor(c[1] / reduction)
    ]);

    // Apply magnification
    let magnify = Math.max(1, +document.getElementById("magnify").value);
    w *= magnify;
    h *= magnify;

    solveHomography(_coords, [[0, 0], [w, 0], [w, h], [0, h]]);
    clearPoints();
    project(w, h);
}

// Handle user click on canvas
function handleClick(e) {
    let { x, y } = source.getBoundingClientRect();
    let _x = e.x - x;
    let _y = e.y - y;

    // Start new coordinate selection
    if (coords.length === 4) {
        coords.splice(0, coords.length);
    }
    coords.push([_x, _y]);

    // Show Rectify button when 4 points selected
    if (coords.length === 4) {
        rectifyBtn.style.display = "";
    }

    // Draw points on SVG overlay
    drawPoints();
}

// Draw homography quadrilateral on SVG overlay
function drawPoints() {
    let imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
    let _coords = coords.slice();
    if (coords.length == 4) {
        // Duplicate the 1st point to close the loop
        _coords.push(_coords[0]);
    }
    let polylineStr = _coords
        .map(c => `${Math.round(c[0])}, ${Math.round(c[1])}`)
        .join(" ");
    overlay.children[0].setAttribute("points", polylineStr);
}

// Clear quadrilateral overlay
function clearPoints() {
    overlay.children[0].setAttribute("points", "");
}

// Apply projective transformation using calculated homography
function project(width, height) {
    let imageData = sourceFullCtx.getImageData(
        0,
        0,
        sourceFull.width,
        sourceFull.height
    );
    target.width = width;
    target.height = height;
    let newData = targetCtx.createImageData(target.width, target.height);
    let i = 0;
    for (let x = 0; x < target.width; x += 1) {
        for (let y = 0; y < target.height; y += 1) {
            let r = [];
            LUPSolve(H, P, [x, y, 1], 3, r);
            let _y = y * (newData.width * 4);
            let _x = _y + x * 4;
            let newx = Math.floor(r[0] / r[2]);
            let newy = Math.floor(r[1] / r[2]);
            let _newy = newy * (imageData.width * 4);
            let _newx = _newy + newx * 4;
            for (let i = 0; i < 4; i++) {
                newData.data[_x + i] = imageData.data[_newx + i];
            }
        }
    }
    targetCtx.clearRect(0, 0, target.width, target.height);
    targetCtx.putImageData(newData, 0, 0);
}

// Handle user drop down selection
function changeImage() {
    image.src = "images/" + select.value;
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

    // Setup SVG overlay
    overlay.setAttribute("width", source.width);
    overlay.setAttribute("height", source.height);

    // Keep full size image in hidden canvas
    sourceFull.width = image.width;
    sourceFull.height = image.height;
    sourceFullCtx.clearRect(0, 0, source.width, source.height);
    sourceFullCtx.drawImage(image, 0, 0);
}

// Initialize application
function init() {
    select = document.getElementById("image-select");
    select.onchange = changeImage;
    overlay = document.getElementById("source-overlay");
    source = document.getElementById("source");
    sourceCtx = source.getContext("2d");
    sourceFull = document.getElementById("source-full");
    sourceFullCtx = sourceFull.getContext("2d");
    target = document.getElementById("target");
    targetCtx = target.getContext("2d");
    rectifyBtn = document.getElementById("rectify");
    rectifyBtn.onclick = handleRectify;
    overlay.onclick = handleClick;
    image = document.getElementById("source-img");
    image.onload = initImage;
    changeImage();
}

window.onload = init;
