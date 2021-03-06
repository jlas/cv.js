let workers = null;

export async function sobel(sourceCtx, targetCtx) {
    if (workers === null) {
        workers = [
            new Worker("sobel_worker/worker.js"),
            new Worker("sobel_worker/worker.js")
        ];
    }

    let imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
    let width = imageData.width;
    let height = imageData.height;

    let gradientX, gradientY;

    // Send message to first worker
    let d1 = imageData.data.buffer.slice();
    workers[0].postMessage(
        { data: d1, mode: 0, width: width, height: height },
        [d1]
    );
    let p1 = new Promise((resolve, reject) => {
        workers[0].onmessage = e => {
            gradientX = new Float64Array(e.data);
            resolve();
        };
    });

    // Send message to second worker
    let d2 = imageData.data.buffer.slice();
    workers[1].postMessage(
        { data: d2, mode: 1, width: width, height: height },
        [d2]
    );
    let p2 = new Promise((resolve, reject) => {
        workers[1].onmessage = e => {
            gradientY = new Float64Array(e.data);
            resolve();
        };
    });

    // Wait on workers to complete
    await Promise.all([p1, p2]);

    let theta = new Float64Array(width * height);
    for (let i = 0; i < width * height; i += 1) {
        theta[i] = Math.atan2(gradientY[i], gradientX[i]);
        gradientY[i] = Math.abs(gradientY[i]);
        gradientX[i] = Math.abs(gradientX[i]);
    }

    let newImage = targetCtx.createImageData(target.width, target.height);
    for (let i = 0, j = 0; i < newImage.data.length; i += 4, j += 1) {
        let _max = gradientX[j] + gradientY[j];
        newImage.data[i] = _max;
        newImage.data[i + 1] = _max;
        newImage.data[i + 2] = _max;
        newImage.data[i + 3] = 255;
    }
    targetCtx.putImageData(newImage, 0, 0);

    return [gradientX, gradientY, theta];
}
