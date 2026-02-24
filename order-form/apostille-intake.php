<?php
// api/apostille-intake.php

// ================= NEXTCLOUD WEBDAV CONFIG =================
$ncBaseUrl = 'https://cloud.mobileamericannotary.com/remote.php/dav/files/shawn/';
$ncUser    = 'shawn@mobileamericannotary.com';
$ncPass    = 'ezNG4-gzF8H-BY3BZ-tXYzD-LAxaN'; // create app password in Nextcloud

function nc_mkdir_if_missing($path, $baseUrl, $user, $pass) {
    // Ensure a folder exists in Nextcloud (safe even if it already exists)
    $url = rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_USERPWD        => "$user:$pass",
        CURLOPT_CUSTOMREQUEST  => 'MKCOL',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER         => true,
        CURLOPT_NOBODY         => true,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// ================= READ INTAKE FIELDS =================
// Names from Step 5 – your HTML uses givenname / familyname.[file:117]
$given  = trim($_POST['given_name']  ?? $_POST['givenname']  ?? '');
$family = trim($_POST['family_name'] ?? $_POST['familyname'] ?? '');
$year   = date('Y'); // e.g. 2026

$customerName = ($family !== '' || $given !== '')
    ? ($family . ', ' . $given)
    : 'Unknown';

// ================= BUILD FOLDER PATH =================
// Temporarily upload directly into the year folder:
// Documents/01 Mobile American Notary/(01) Apostilles/Clients/{YEAR}/
$baseFolder = 'Documents/01 Mobile American Notary/(01) Apostilles/Clients';
$yearFolder = $baseFolder . '/' . $year;

// Make sure these exist in Nextcloud
nc_mkdir_if_missing($baseFolder, $ncBaseUrl, $ncUser, $ncPass);
nc_mkdir_if_missing($yearFolder, $ncBaseUrl, $ncUser, $ncPass);

// ================= HANDLE UPLOADED FILES =================
$uploadedFiles = [];

if (!empty($_FILES['intake_upload_files']['name'][0])) {
    foreach ($_FILES['intake_upload_files']['name'] as $idx => $origName) {
        if ($_FILES['intake_upload_files']['error'][$idx] !== UPLOAD_ERR_OK) {
            continue;
        }

        $tmpPath  = $_FILES['intake_upload_files']['tmp_name'][$idx];

        // Clean filename to avoid weird characters in WebDAV path
        $safeName = preg_replace('/[^\w.\- ]+/', '_', $origName);
        $remotePath = $yearFolder . '/' . time() . '-' . $safeName;


        $url = rtrim($ncBaseUrl, '/') . '/' . ltrim($remotePath, '/');

        $fp = fopen($tmpPath, 'r');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_USERPWD        => "$ncUser:$ncPass",
            CURLOPT_PUT            => true,
            CURLOPT_INFILE         => $fp,
            CURLOPT_INFILESIZE     => filesize($tmpPath),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        curl_exec($ch);
        curl_close($ch);
        fclose($fp);

        $uploadedFiles[] = [
            'originalName'  => $origName,
            'nextcloudPath' => $remotePath,
        ];
    }
}

// ================= TODO: SAVE / EMAIL INTAKE =================
// Here you can insert into a database or send an email containing
// $customerName, $year, $_POST, and $uploadedFiles.

header('Content-Type: application/json');
echo json_encode([
    'ok'            => true,
    'customerName'  => $customerName,
    'year'          => $year,
    'uploadedFiles' => $uploadedFiles,
]);

