<?php
// Basic Apostille intake handler

// 1. Simple spam/validation guard
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: main.html#apostille-section');
    exit;
}

function field($key) {
    return isset($_POST[$key]) ? trim($_POST[$key]) : '';
}

$name       = field('name');
$email      = field('email');
$phone      = field('phone');
$docType    = field('doc_type');
$destination= field('destination');
$states     = field('states');
$handling   = field('handling');
$timeline   = field('timeline');
$details    = field('details');

// 2. Minimal required fields check
if ($name === '' || $email === '' || $docType === '' || $destination === '') {
    header('Location: main.html#apostille-section');
    exit;
}

// 3. Build email
$to      = 'shawn@mobileamericannotary.com';   // change to your real address
$subject = 'New Apostille Intake Request from ' . $name;

$body = "New apostille intake submission:\n\n"
      . "Name: $name\n"
      . "Email: $email\n"
      . "Phone: $phone\n\n"
      . "Document type: $docType\n"
      . "Destination country: $destination\n"
      . "Issuing state(s): $states\n"
      . "How documents will be handled: $handling\n"
      . "Timeline: $timeline\n\n"
      . "Additional details:\n$details\n";

$headers   = "From: Mobile American Notary <no-reply@mobileamericannotary.com>\r\n";
$headers  .= "Reply-To: $name <$email>\r\n";

// 4. Send and redirect
@mail($to, $subject, $body, $headers);

// Optional: simple thank-you page/anchor
header('Location: main.html#apostille-section');
exit;
