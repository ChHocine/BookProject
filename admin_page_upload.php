<?php
header('Content-Type: application/json');

$uploadDir = __DIR__ . '/uploads/';
$extractedDir = __DIR__ . '/extracted/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}
if (!is_dir($extractedDir)) {
    mkdir($extractedDir, 0777, true);
}

$response = [
    'status' => 'error',
    'message' => 'Unknown error occurred.',
    'files' => []
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['pdfFile']) && $_FILES['pdfFile']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['pdfFile']['tmp_name'];
        $fileName = $_FILES['pdfFile']['name'];
        $destPath = $uploadDir . $fileName;

        if (move_uploaded_file($fileTmpPath, $destPath)) {
            $outputFile = $extractedDir . pathinfo($fileName, PATHINFO_FILENAME) . '.txt';
            $command = escapeshellcmd("python3 Pdf_Extract.py \"$destPath\" \"$outputFile\"");
            exec($command, $output, $returnVar);
            

            if ($returnVar === 0) {
                $files = array_values(array_diff(scandir($extractedDir), ['.', '..']));

                $response['status'] = 'success';
                $response['message'] = 'File uploaded and processed successfully.';
                $response['files'] = $files;
            } else {
                $response['status'] = 'error';
                $response['message'] = 'Error executing the PDF extraction script.';
            }
        } else {
            $response['status'] = 'error';
            $response['message'] = 'Failed to move the uploaded file.';
        }
    } else {
        $response['status'] = 'error';
        $response['message'] = 'No file uploaded or upload error.';
    }
} else {
    $response['status'] = 'error';
    $response['message'] = 'Invalid request method.';
}


echo json_encode($response);
