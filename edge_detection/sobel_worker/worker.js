function filterY(imageDataData, width, height, filter) {
    let d = imageDataData;
    let r = new Float64Array(d.length);
    let k = filter;
    for (let y = 1; y < height - 1; y += 1) {
        let iw4 = width * 4;
        let ym1 = (y - 1) * iw4;
        let y1 = y * iw4;
        let yp1 = (y + 1) * iw4;
        for (let x = 1; x < width - 1; x += 1) {
            let x4 = x * 4;
            let xm1 = ym1 + x4;
            let x1 = y1 + x4;
            let xp1 = yp1 + x4;
            for (let c = 0; c < 3; c += 1) {
                r[x1 + c] =
                    d[xm1 + c] * k[0] + d[x1 + c] * k[1] + d[xp1 + c] * k[2];
            }
        }
    }
    return r;
}

function filterX(imageDataData, width, height, filter) {
    let d = imageDataData;
    let r = new Float64Array(d.length);
    let k = filter;
    for (let y = 1; y < height - 1; y += 1) {
        let y1 = y * (width * 4);
        for (let x = 1; x < width - 1; x += 1) {
            let xm1 = y1 + (x - 1) * 4;
            let x1 = y1 + x * 4;
            let xp1 = y1 + (x + 1) * 4;
            for (let c = 0; c < 3; c += 1) {
                r[x1 + c] =
                    d[xm1 + c] * k[0] + d[x1 + c] * k[1] + d[xp1 + c] * k[2];
            }
        }
    }
    return r;
}

function onMessage(e) {
    let { data, mode, width, height } = e.data;

    data = new Uint8ClampedArray(data);
    let result;

    if (mode === 0) {
        // X direction
        let filteredXY = filterY(data, width, height, [1, 2, 1]);
        result = filterX(filteredXY, width, height, [1, 0, -1]);
    } else {
        // Y direction
        let filteredYX = filterX(data, width, height, [1, 2, 1]);
        result = filterY(filteredYX, width, height, [1, 0, -1]);
    }

    let truncated = new Float64Array(width * height);
    for (let i = 0, j = 0; i < result.length; i += 4, j += 1) {
        truncated[j] = Math.max(
            Math.abs(result[i]),
            Math.abs(result[i + 1]),
            Math.abs(result[i + 2])
        );
    }

    let b = truncated.buffer;
    postMessage(b, [b]);
}

onmessage = onMessage;
