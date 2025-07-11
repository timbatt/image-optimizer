import { useState } from 'react';
import JSZip from 'jszip';


function convertImage(image, format, quality = 0.8) {
   return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Conversion failed'));
            }, `image/${format}`, quality);
        };

        img.onerror = () => reject(new Error('Image loading failed'));
        img.src = URL.createObjectURL(image);
   });
}

// I don't like how this works. 
// Find a way to pass the blobs and the image names to the zip creation function.
function createZipFile(blobsData) {
    return new Promise((resolve, reject) => {
        const zip = new JSZip();
        const promises = blobsData.map(({ blob, name }) => zip.file(name, blob));
        Promise.all(promises)
            .then(() => zip.generateAsync({ type: 'blob' }))
            .then(zipBlob => resolve(zipBlob))
            .catch(error => reject(error));
    });
}

function ImageConverterForm() {
    const [selectedImages, setSelectedImages] = useState([]);
    const [format, setFormat] = useState('webp');
    const [quality, setQuality] = useState(8); 
    const [result, setResult] = useState([]);
    const [zipFile, setZipFile] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [convertedCount, setConvertedCount] = useState(0);
    const [originalSizeKB, setOriginalSize] = useState(0);
    const [convertedSizeKB, setConvertedSize] = useState(0);

    const handleFormatChange = (event) => setFormat(event.target.value);
    const handleQualityChange = (event) => setQuality(parseInt(event.target.value) / 10);
    const handleFileChange = (event) => setSelectedImages(event.target.files);

    function resetForm() {
        setResult([]);
        setZipFile(null);
        setError(null);
        setIsLoading(true);
        setConvertedCount(0);
        setOriginalSize(0);
        setConvertedSize(0);
        setDone(false);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        resetForm();

        if (selectedImages.length === 0) {
            setError('Please select at least one image.');
            return;
        } 

        const resultArray = []; // Hold the image URLs when ready for downloading
        const blobsArray = []; // Array to hold blobs for ZIP file creation

        for (const image of selectedImages) {
            try {
                // Convert and get a downloadable URL
                const convertedBlob = await convertImage(image, format, quality);

                const url = URL.createObjectURL(convertedBlob);
                const download = `${image.name.split('.')[0]}.${format}`;
                
                resultArray.push({ url, name: download });
                blobsArray.push({ blob: convertedBlob, name: download });

                setConvertedCount(prevCount => prevCount + 1);
                setOriginalSize(prevSize => prevSize + Math.round(image.size / 1024) );
                setConvertedSize(prevSize => prevSize + Math.round(convertedBlob.size / 1024));
            } catch (error) {
                console.error('Error converting image:', error);
                setError(`Error converting ${image.name}: ${error.message}`);
                continue;
            }
        }
        setResult(resultArray);

        // Create a ZIP file, if possible
        if (resultArray.length > 1) {
            try {
                const zipBlob = await createZipFile(blobsArray);
                setZipFile(URL.createObjectURL(zipBlob));

            } catch (error) {
                console.error('Error creating ZIP file:', error);
                setError(`Error creating ZIP file: ${error.message}`);
            }
        }

        setIsLoading(false);
        setDone(true);
    }

    function makeFileName() {
        const date = new Date();
        return `${date.toISOString().split('T')[0]}_converted_images_${format}.zip`;
    }

    return (
    <>
    <form onSubmit={ handleSubmit } id="image-converter-form" className="flex flex-col gap-4 m-auto my-8">
        <fieldset>
            <label htmlFor="image-input" className="btn btn-secondary text-center">Select Images (JPEG, PNG, WEBP)</label>
            <input className="hidden" type="file" id="image-input" accept="image/*" multiple 
                onChange={ handleFileChange }
            />
            {selectedImages.length > 0 && <p className="text-center">Selected {selectedImages.length} images</p>}
        </fieldset>

        {selectedImages.length > 0 && <fieldset>
            <label htmlFor="format-select">Select Output Format:</label>
            <select id="format-select" className="ml-4" 
                onChange={ handleFormatChange } 
                value={ format }
            >
                <option value="webp">WEBP</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
            </select>
        </fieldset> }

        { selectedImages.length > 0 && <>
            {format !== "png" ? <fieldset>
                <label htmlFor="quality-range">Quality (1-10):</label>
                <input type="number" id="quality-range" class='ml-4' min="1" max="10"
                    defaultValue={ quality } 
                    onChange={ handleQualityChange }
                /><br/>
                <p>Higher values result in better quality but larger file sizes.</p>
            </fieldset>: <p className='text-center'>PNG format does not support quality settings.</p>}
        </>}

        { selectedImages.length > 0 && <input type="submit" className='btn w-64 m-auto mt-4' value="Convert"/>}
        {isLoading && <p>Working...</p>}
    </form>


    <div id="result" className="flex flex-col justify-center">

        {convertedCount > 0 && <div className="mb-4 "> 
            <p className="font-bold text-lg">Converted {convertedCount} image{convertedCount > 1 && 's'}.</p>

            {convertedSizeKB < originalSizeKB && done && <>
                <p className="font-bold text-lg">Saved: {Math.round((1 - (convertedSizeKB / originalSizeKB)) * 100)}%</p>
                <p>Original Size: {originalSizeKB} KB</p>
                <p>Converted Size: {convertedSizeKB} KB</p>
            </>}
        </div>}


        {zipFile && (
            <a href={zipFile} download={ makeFileName() } className='btn btn-success m-auto mb-4'>Download Converted Images</a>
        )}

        <div className="result-gallery">
            {result.length > 0 && result.map((item, index) => (
                <a key={index} href={item.url} download={item.name} className='block text-center result-img-wrap'>
                    <img src={item.url} alt={item.name} className="result-img"/>
                </a>
            ))}
        </div>
        
        {error && <p style={{color: 'red'}}>Error: {error}</p>}
    </div>
    
    </>
    )
}

function ImageConverter() {

    return (
    <div className="flex flex-col items-center justify-center p-4 min-h-[75vh]">
        <h1>Free Image Converter</h1>
        <p className="text-lg">Select images to convert and optimize.</p>
        <ImageConverterForm />

        <p className="text-gray-400 mt-4">
            Your images are not stored on our server.<br/>
            This means you can safely upload and convert your images without worrying about privacy or data retention.
        </p>
    </div>);
}

export default ImageConverter;