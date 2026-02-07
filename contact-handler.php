<?php
// Honeypot check
$honeypot = $_POST['website'] ?? '';
if (!empty($honeypot)) {
    echo 'OK';
    exit;
}

$to = "info@mobileamericannotary.com";

$name    = $_POST['name']    ?? '';
$email   = $_POST['email']   ?? '';
$service = $_POST['service'] ?? '';
$message = $_POST['message'] ?? '';

$subject = "Website contact form – Mobile American Notary";
$body  = "Name: $name\n";
$body .= "Email: $email\n";
$body .= "Service: $service\n\n";
$body .= "Message:\n$message\n";

$headers  = "From: info@mobileamericannotary.com\r\n";
$headers .= "Reply-To: $email\r\n";

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    echo 'OK';
} else {
    http_response_code(500);
    echo 'ERROR';
}

