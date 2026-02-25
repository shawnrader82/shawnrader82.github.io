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

// ================= SAVE / EMAIL INTAKE & SHOW THANK-YOU =================

// Helper to safely get a trimmed POST value
function p($key) {
  return isset($_POST[$key]) && $_POST[$key] !== '' ? trim($_POST[$key]) : '';
}

// TEMP: debug what delivery_method we actually get
file_put_contents('/tmp/apostille-debug.txt', print_r($_POST, true));

// We already have $customerName and $year above.
// Build key sections from the form POST. Adjust field names if needed.

// Primary contact (your details, Step 5)
$givenName  = p('given_name');
$familyName = p('family_name');
$company    = p('organization');
$email      = p('email');
$phone      = p('tel');

// Services & usage
$rawServices = $_POST['services'] ?? [];
if (is_string($rawServices)) {
  // Single value from a non-array input
  $services = [$rawServices];
} else {
  $services = $rawServices;
}

$usageType         = p('usagetype');           // "personal" / "business"
$deliveryMethod    = p('delivery_method');     // "in_person_home", "in_person_office", "mail_to_office", "upload_only"
$documentsSummary  = p('documents_summary');   // optional free‑text summary


// Mailing / return address (your address)
$mailing = [
  'address_1' => p('mailing_address_1'),
  'address_2' => p('mailing_address_2'),
  'city'      => p('mailing_city'),
  'state'     => p('mailing_state'),
  'zip'       => p('mailing_zip'),
  'country'   => p('mailing_country'),
];

// US recipient (if provided)
$usRecipient = [
  'first_name' => p('us_recipient_first_name'),
  'last_name'  => p('us_recipient_last_name'),
  'company'    => p('us_recipient_company'),
  'email'      => p('us_recipient_email'),
  'phone'      => p('us_recipient_phone'),
  'address_1'  => p('us_recipient_address_1'),
  'address_2'  => p('us_recipient_address_2'),
  'city'       => p('us_recipient_city'),
  'state'      => p('us_recipient_state'),
  'zip'        => p('us_recipient_zip'),
  'country'    => p('us_recipient_country'),
];

// International recipient (if provided)
$intlRecipient = [
  'first_name' => p('intl_recipient_first_name'),
  'last_name'  => p('intl_recipient_last_name'),
  'company'    => p('intl_recipient_company'),
  'email'      => p('intl_recipient_email'),
  'phone'      => p('intl_recipient_phone'),
  'address_1'  => p('intl_recipient_address_1'),
  'address_2'  => p('intl_recipient_address_2'),
  'address_3'  => p('intl_recipient_address_3'),
  'city'       => p('intl_recipient_city'),
  'state'      => p('intl_recipient_state'),
  'postal'     => p('intl_recipient_postal'),
  'country'    => p('intl_recipient_country'),
];

// Helper: render a section only if at least one field has a value
function sectionBlock($title, $fields) {
  $lines = [];
  foreach ($fields as $label => $value) {
    if ($value !== '') {
      $lines[] = $label . ': ' . $value;
    }
  }
  if (empty($lines)) return '';
  $out  = $title . "\n";
  $out .= str_repeat('-', strlen($title)) . "\n";
  $out .= implode("\n", $lines) . "\n\n";
  return $out;
}

// Services text
$serviceLabels = [];
if (in_array('apostille', $services, true))   $serviceLabels[] = 'Apostille / authentication';
if (in_array('translation', $services, true)) $serviceLabels[] = 'Certified document translation';
$servicesText = implode(', ', $serviceLabels);

// Usage & delivery
$usageLabel = $usageType === 'business'
  ? 'Business'
  : ($usageType === 'personal' ? 'Personal' : '');

if ($deliveryMethod === 'mail_to_office') {
  $deliveryLabel = 'Mail documents to Mobile American Notary office';
} elseif ($deliveryMethod === 'in_person_home') {
  $deliveryLabel = 'In‑person at your home/office';
} elseif ($deliveryMethod === 'in_person_office') {
  $deliveryLabel = 'In‑person at our office';
} elseif ($deliveryMethod === 'upload_only') {
  $deliveryLabel = 'Document upload only';
} else {
  $deliveryLabel = '';
}

// Used later to decide whether to show the mailing-address box
$willMailDocs = ($deliveryMethod === 'mail_to_office');

// Build main email body
$body  = "Apostille order request – {$year}\n";
$body .= "================================\n\n";

$body .= sectionBlock('Primary contact', [
  'Name'    => trim($givenName . ' ' . $familyName),
  'Company' => $company,
  'Email'   => $email,
  'Phone'   => $phone,
]);

$body .= sectionBlock('Services & usage', [
  'Services requested' => $servicesText,
  'Usage type'         => $usageLabel,
  'Delivery method'    => $deliveryLabel,
  'Documents summary'  => $documentsSummary,
]);

$body .= sectionBlock('Your mailing / return address', [
  'Address line 1' => $mailing['address_1'],
  'Address line 2' => $mailing['address_2'],
  'City'           => $mailing['city'],
  'State'          => $mailing['state'],
  'ZIP / postal'   => $mailing['zip'],
  'Country'        => $mailing['country'],
]);

$body .= sectionBlock('US recipient (if provided)', [
  'Name'          => trim($usRecipient['first_name'].' '.$usRecipient['last_name']),
  'Company'       => $usRecipient['company'],
  'Email'         => $usRecipient['email'],
  'Phone'         => $usRecipient['phone'],
  'Address line1' => $usRecipient['address_1'],
  'Address line2' => $usRecipient['address_2'],
  'City'          => $usRecipient['city'],
  'State'         => $usRecipient['state'],
  'ZIP'           => $usRecipient['zip'],
  'Country'       => $usRecipient['country'],
]);

$body .= sectionBlock('International recipient (if provided)', [
  'Name'          => trim($intlRecipient['first_name'].' '.$intlRecipient['last_name']),
  'Company'       => $intlRecipient['company'],
  'Email'         => $intlRecipient['email'],
  'Phone'         => $intlRecipient['phone'],
  'Address line1' => $intlRecipient['address_1'],
  'Address line2' => $intlRecipient['address_2'],
  'Address line3' => $intlRecipient['address_3'],
  'City / town'   => $intlRecipient['city'],
  'State / region'=> $intlRecipient['state'],
  'Postal code'   => $intlRecipient['postal'],
  'Country'       => $intlRecipient['country'],
]);

// Attach uploaded file list, if any
if (!empty($uploadedFiles)) {
  $body .= "Uploaded files\n";
  $body .= "--------------\n";
  foreach ($uploadedFiles as $f) {
    $body .= '- ' . ($f['originalName'] ?? 'File') .
             ' → ' . ($f['nextcloudPath'] ?? '') . "\n";
  }
  $body .= "\n";
}

// ========== SEND EMAILS ==========

// To you
$toAdmin = 'orders@mobileamericannotary.com';
$subject = 'New apostille order request from ' . $customerName;

$headers  = "From: no-reply@mobileamericannotary.com\r\n";
if ($email !== '') {
  $headers .= "Reply-To: {$email}\r\n";
}

@mail($toAdmin, $subject, $body, $headers);

// To customer
if ($email !== '') {
  $custSubject = 'We received your apostille order request';
  $custBody    = "Thank you for your request.\n\n"
               . "Here is a summary of what you submitted:\n\n"
               . $body
               . "We will follow up with you shortly.\n";
  @mail($email, $custSubject, $custBody, $headers);
}

// ========== THANK-YOU PAGE ==========

$willMailDocs = ($deliveryMethod === 'mail');
$displayName  = $customerName !== '' ? $customerName : 'Customer';

?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Thank you – Mobile American Notary</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://mobileamericannotary.com/styles-v2.css">
  <link rel="stylesheet" href="apostille-form.css">
</head>
<body>

<div id="header-placeholder"></div>

<main class="page-wrap" style="min-height:60vh;">
  <div class="intake-shell">
    <section class="intake-card" style="max-width:720px;margin:32px auto;">
      <p class="step-label">Request received</p>
      <h1 class="service-detail-title" style="margin-top:4px;">
        Thank you, <?php echo htmlspecialchars($displayName); ?>.
      </h1>
      <p class="service-detail-subtitle" style="margin-bottom:16px;">
        We’ve received your apostille order request and emailed you a copy of your answers.
      </p>

      <?php if ($willMailDocs): ?>
        <div class="intake-card" style="margin-top:12px;">
          <h2 class="service-detail-title" style="margin-top:0;margin-bottom:4px;">
            Where to mail your documents
          </h2>
          <p class="service-detail-subtitle">
            Please send your original documents and a printed copy of your confirmation email to:
          </p>
              <div class="full-field" style="margin-top:8px;">
      <p style="margin:0;font-weight:600;">Mobile American Notary</p>
      <p style="margin:0;">10336 Woodley Ave</p>
      <p style="margin:0;">Granada Hills, CA 91344</p>
      <p style="margin:8px 0 0 0;">Include tracking on your shipment for your records.</p>
    </div>
        </div>
      <?php else: ?>
        <div class="intake-card" style="margin-top:12px;">
          <h2 class="service-detail-title" style="margin-top:0;margin-bottom:4px;">
            What happens next
          </h2>
          <p class="service-detail-subtitle">
            A member of our team will review your request and contact you shortly to confirm details and schedule your appointment.
          </p>
        </div>
      <?php endif; ?>

      <div class="form-actions" style="margin-top:24px;">
        <a class="btn btn-primary" href="https://mobileamericannotary.com/">
          Back to home →
        </a>
      </div>
    </section>
  </div>
</main>

<div id="footer-placeholder"></div>

<script src="header.js" defer></script>
<script src="footer.js" defer></script>
</body>
</html>
<?php
exit;

