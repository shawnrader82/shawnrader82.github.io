<?php
// api/apostille-intake.php

require __DIR__ . '/PHPMailer-master/src/PHPMailer.php';
require __DIR__ . '/PHPMailer-master/src/SMTP.php';
require __DIR__ . '/PHPMailer-master/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ================= NEXTCLOUD WEBDAV CONFIG =================
$ncBaseUrl = 'https://cloud.mobileamericannotary.com/remote.php/dav/files/shawn/';
$ncUser    = 'shawn@mobileamericannotary.com';
$ncPass    = 'ezNG4-gzF8H-BY3BZ-tXYzD-LAxaN'; // Nextcloud app password

function nc_mkdir_if_missing($path, $baseUrl, $user, $pass) {
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

// TEMP: debug what delivery_method we actually get
error_log('INTAKE_POST_DELIVERY=' . ($_POST['delivery_method'] ?? '(missing)'));
file_put_contents('/tmp/apostille-debug.txt', print_r($_POST, true));

// Basic identity fields (used for folder naming and display)
$given  = trim($_POST['given_name']  ?? $_POST['givenname']  ?? '');
$family = trim($_POST['family_name'] ?? $_POST['familyname'] ?? '');
$year   = date('Y');

$customerName = ($given !== '' || $family !== '')
    ? trim($given . ' ' . $family)
    : 'Customer';

// ================= BUILD FOLDER PATH =================

// Documents/01 Mobile American Notary/(01) Apostilles/Clients/{YEAR}/
$baseFolder = 'Documents/01 Mobile American Notary/(01) Apostilles/Clients';
$yearFolder = $baseFolder . '/' . $year;

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

// Helper to safely get a trimmed POST value (always returns a string)
function p($key) {
  if (!isset($_POST[$key]) || $_POST[$key] === null) {
    return '';
  }
  return trim((string)$_POST[$key]);
}


// Primary contact (your details, Step 5)
$givenName  = p('given_name');
$familyName = p('family_name');
$company    = p('organization');
$email      = p('email');
$phone      = p('tel');

// Services & usage
$rawServices = $_POST['services'] ?? [];
if (is_string($rawServices)) {
  $services = [$rawServices];
} else {
  $services = $rawServices;
}

// Usage and delivery (from hidden fields)
$usageType        = (string)p('usagetype');        // "personal" / "business"
$deliveryMethod   = (string)p('delivery_method');  // "in_person_home", "in_person_office", "mail_to_office", "upload_only"
$documentsSummary = (string)p('documents_summary');


// Document details (Step 2)
$documentStates     = $_POST['document_state']     ?? [];  // array
$documentTypes      = $_POST['document_type']      ?? [];  // array
$documentQuantities = $_POST['document_quantity']  ?? [];  // array
$documentCountries  = $_POST['document_country']   ?? [];  // array

$totalDocuments           = p('total_documents');
$apostilleEstimatedTotal  = p('apostille_estimated_total');

// Translation details (Step 2 – translation block)
$translationFromLanguage      = p('translation_from_language');
$translationToLanguage        = p('translation_to_language');
$translationApproxPages       = p('translation_words');
$translationEstimatedTotal    = p('translation_estimated_total');

// Other names
$otherNames = p('other_names');

// Shipping / delivery choices (Step 3 & 4)
$shippingRecipientType  = p('shipping_recipient_type');     // international_recipient / other_us_recipient / back_to_you / pickup_office / same_day_courier_la / same_day_courier_oc
$orderEstimatedTotal    = p('order_estimated_total');       // final live estimate

// Step 3 speed & add-ons
$apostilleSpeedOption       = p('apostille_speed_option');
$apostilleRushNotes         = p('apostille_speed_notes');
$addonShippedHardCopy       = p('addon_shipped_hard_copy');
$addonNotarization          = p('addon_notarization');
$addonExpeditedTurnaround   = p('addon_expedited_turnaround');


// Mailing / return address (your address)
$mailing = [
  // Names must match your HTML form
  'address_1' => p('street_address'),
  'address_2' => p('address_line2'),
  'city'      => p('address_level2'),
  'state'     => p('address_level1'),
  'zip'       => p('postal_code'),
  'country'   => p('country_name'),
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
  $deliveryLabel = 'In-person at your home/office';
} elseif ($deliveryMethod === 'in_person_office') {
  $deliveryLabel = 'In-person at our office';
} elseif ($deliveryMethod === 'upload_only') {
  $deliveryLabel = 'Document upload only';
} else {
  $deliveryLabel = '';
}

// Used later to decide whether to show the mailing-address box
$willMailDocs = ($deliveryMethod === 'mail_to_office');

// Build main text email body (for logging / admin)
$body  = "Apostille order request - {$year}\n";
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

$body .= sectionBlock('Speed & add-ons', [
  'Apostille speed option'           => $apostilleSpeedOption,
  'Apostille rush notes'             => $apostilleRushNotes,
  'Translation add-on: hard copy'    => $addonShippedHardCopy     ? 'Yes' : '',
  'Translation add-on: notarization' => $addonNotarization        ? 'Yes' : '',
  'Translation add-on: expedited'    => $addonExpeditedTurnaround ? 'Yes' : '',
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

if (!empty($uploadedFiles)) {
  $body .= "Uploaded files\n";
  $body .= "--------------\n";
  foreach ($uploadedFiles as $f) {
    $body .= '- ' . ($f['originalName'] ?? 'File') .
             ' -> ' . ($f['nextcloudPath'] ?? '') . "\n";
  }
  $body .= "\n";
}

// Build a simple HTML version for customer
$htmlBody  = '<h2 style="margin:0 0 12px 0;font-family:system-ui,Arial,sans-serif;">';
$htmlBody .= 'Apostille order request - ' . htmlspecialchars($year) . '</h2>';

$htmlBody .= '<p style="margin:0 0 12px 0;font-family:system-ui,Arial,sans-serif;">'
          . 'Here is a copy of your answers for your records:</p>';

$htmlBody .= '<h3 style="margin:16px 0 6px 0;font-family:system-ui,Arial,sans-serif;">Primary contact</h3>';
$htmlBody .= '<p style="margin:0 0 8px 0;font-family:system-ui,Arial,sans-serif;">'
          . 'Name: '    . htmlspecialchars(trim($givenName . " " . $familyName)) . '<br>'
          . 'Company: ' . htmlspecialchars($company) . '<br>'
          . 'Email: '   . htmlspecialchars($email) . '<br>'
          . 'Phone: '   . htmlspecialchars($phone) . '</p>';

$htmlBody .= '<h3 style="margin:16px 0 6px 0;font-family:system-ui,Arial,sans-serif;">Services &amp; usage</h3>';
$htmlBody .= '<p style="margin:0 0 8px 0;font-family:system-ui,Arial,sans-serif;">'
          . 'Services requested: ' . htmlspecialchars($servicesText) . '<br>'
          . 'Usage type: '         . htmlspecialchars($usageLabel) . '<br>'
          . 'Delivery method: '    . htmlspecialchars($deliveryLabel) . '</p>';

$htmlBody .= '<h3 style="margin:16px 0 6px 0;font-family:system-ui,Arial,sans-serif;">Your mailing / return address</h3>';
$htmlBody .= '<p style="margin:0 0 8px 0;font-family:system-ui,Arial,sans-serif;">'
          . htmlspecialchars($mailing['address_1']) . '<br>'
          . htmlspecialchars($mailing['address_2']) . '<br>'
          . htmlspecialchars($mailing['city']) . ', '
          . htmlspecialchars($mailing['state']) . ' '
          . htmlspecialchars($mailing['zip']) . '<br>'
          . htmlspecialchars($mailing['country']) . '</p>';

// ========== SEND EMAILS VIA GMAIL SMTP ==========

function send_via_gmail($to, $subject, $body, $replyToEmail = '', $replyToName = '')
{
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'shawn@mobileamericannotary.com';
        $mail->Password   = 'cwii bwin uefw vmqy'; // app password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom('no-reply@mobileamericannotary.com', 'Mobile American Notary');
        if ($replyToEmail !== '') {
            $mail->addReplyTo($replyToEmail, $replyToName ?: $replyToEmail);
        }

        $mail->clearAllRecipients();
        $mail->addAddress($to);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->AltBody = strip_tags($body);

        $mail->send();
    } catch (Exception $e) {
        error_log('PHPMailer error: ' . $mail->ErrorInfo);
    }
}

// Internal notification (to your alias inbox)
$toAdmin   = 'orders@mobileamericannotary.com';
$subject   = 'New apostille order request from ' . $customerName;
$replyTo   = $email;
$replyName = $givenName;

// Admin body: text summary but with basic HTML line breaks
$adminBody = nl2br(htmlspecialchars((string)$body));
send_via_gmail($toAdmin, $subject, $adminBody, $replyTo, $replyName);

// Customer receipt
if ($email !== '') {
    $custSubject = 'We received your apostille request';

    // Build a Jotform-style HTML table email
    $custBody = '
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Apostille order summary</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f8;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="700" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e0e0e0;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;">
          <tr>
            <td colspan="2" style="padding:16px 20px;border-bottom:2px solid #f37021;background:#fafafa;">
              <h2 style="margin:0;font-size:18px;font-weight:600;">Apostille Order Summary</h2>
              <p style="margin:4px 0 0 0;font-size:12px;color:#555;">Submitted ' . htmlspecialchars(date("F j, Y, g:i a")) . '</p>
            </td>
          </tr>

          <tr>
            <td colspan="2" style="padding:14px 20px;border-bottom:1px solid #e0e0e0;">
              <p style="margin:0 0 6px 0;">Hi ' . htmlspecialchars($givenName) . ',</p>
              <p style="margin:0;">We have received your apostille/translation request. Below is a copy of your answers for your records.</p>
            </td>
          </tr>

          <!-- Primary contact -->
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              Primary contact
            </td>
          </tr>
          <tr>
            <td width="220" style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Name</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars(trim($givenName . " " . $familyName)) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Company</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($company) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Email</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;"><a href="mailto:' . htmlspecialchars($email) . '" style="color:#0066cc;">' . htmlspecialchars($email) . '</a></td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;color:#555;">Phone</td>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;">' . htmlspecialchars($phone) . '</td>
          </tr>

          <!-- Services & usage -->
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              Services &amp; usage
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Services requested</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($servicesText) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Usage type</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($usageLabel) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Delivery method</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($deliveryLabel) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Document state(s)</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars(implode(", ", $documentStates)) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Destination country(ies)</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars(implode(", ", $documentCountries)) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Total documents</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars($totalDocuments) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Apostille estimated total (USD)</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars($apostilleEstimatedTotal) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Translation from → to</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars($translationFromLanguage) . ' → ' .
              htmlspecialchars($translationToLanguage) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Approx. pages to translate</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars($translationApproxPages) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;color:#555;">Translation estimated total (USD)</td>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;">' .
              htmlspecialchars($translationEstimatedTotal) . '</td>
          </tr>

          <!-- Speed & add-ons -->
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              Speed &amp; add-ons
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Apostille speed option</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars($apostilleSpeedOption) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Apostille rush notes</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars($apostilleRushNotes) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Translation add-ons</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' .
              htmlspecialchars(
                trim(
                  ($addonShippedHardCopy     ? 'Shipped hard copy; ' : '') .
                  ($addonNotarization        ? 'Notarization; ' : '') .
                  ($addonExpeditedTurnaround ? 'Expedited turnaround' : '')
                )
              ) . '</td>
          </tr>


          <!-- Mailing address -->
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              Your mailing / return address
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Address</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">'
              . htmlspecialchars($mailing["address_1"]) . '<br>'
              . htmlspecialchars($mailing["address_2"]) . '<br>'
              . htmlspecialchars($mailing["city"]) . ', '
              . htmlspecialchars($mailing["state"]) . ' '
              . htmlspecialchars($mailing["zip"]) . '<br>'
              . htmlspecialchars($mailing["country"]) .
            '</td>
          </tr>';

    // US recipient (optional)
// Only show US recipient if any key fields are filled
$hasUs = (
    $usRecipient['first_name'] !== '' ||
    $usRecipient['last_name']  !== '' ||
    $usRecipient['email']      !== '' ||
    $usRecipient['phone']      !== '' ||
    $usRecipient['address_1']  !== ''
);

    if ($hasUs) {
        $custBody .= '
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              US recipient (if provided)
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Name</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">'
              . htmlspecialchars(trim($usRecipient["first_name"] . " " . $usRecipient["last_name"])) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Company</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($usRecipient["company"]) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Address</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">'
              . htmlspecialchars($usRecipient["address_1"]) . '<br>'
              . htmlspecialchars($usRecipient["address_2"]) . '<br>'
              . htmlspecialchars($usRecipient["city"]) . ', '
              . htmlspecialchars($usRecipient["state"]) . ' '
              . htmlspecialchars($usRecipient["zip"]) . '<br>'
              . htmlspecialchars($usRecipient["country"]) .
            '</td>
          </tr>';
    }

    // International recipient (optional)
    $hasIntl = implode('', $intlRecipient) !== '';
    if ($hasIntl) {
        $custBody .= '
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              International recipient (if provided)
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Name</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">'
              . htmlspecialchars(trim($intlRecipient["first_name"] . " " . $intlRecipient["last_name"])) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Company</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">' . htmlspecialchars($intlRecipient["company"]) . '</td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;color:#555;">Address</td>
            <td style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">'
              . htmlspecialchars($intlRecipient["address_1"]) . '<br>'
              . htmlspecialchars($intlRecipient["address_2"]) . '<br>'
              . htmlspecialchars($intlRecipient["address_3"]) . '<br>'
              . htmlspecialchars($intlRecipient["city"]) . ', '
              . htmlspecialchars($intlRecipient["state"]) . ' '
              . htmlspecialchars($intlRecipient["postal"]) . '<br>'
              . htmlspecialchars($intlRecipient["country"]) .
            '</td>
          </tr>';
    }

    // Documents summary
    if ($documentsSummary !== '') {
        $custBody .= '
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              Documents summary
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;color:#555;">Details</td>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;">'
              . nl2br(htmlspecialchars($documentsSummary)) . '</td>
          </tr>';
    }

    // Other names
    if ($otherNames !== '') {
        $custBody .= '
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              Other names on these documents
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;color:#555;">Names</td>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;">'
              . nl2br(htmlspecialchars($otherNames)) . '</td>
          </tr>';
    }

    // Final estimated total
    if ($orderEstimatedTotal !== '') {
        $custBody .= '
          <tr>
            <td colspan="2" style="padding:10px 20px;background:#f9f9fb;border-bottom:1px solid #e0e0e0;font-weight:600;">
              Final estimated total
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;color:#555;">Current estimate (USD)</td>
            <td style="padding:8px 20px;border-bottom:1px solid #e0e0e0;">'
              . htmlspecialchars($orderEstimatedTotal) . '</td>
          </tr>';
    }

    // Footer note
    $custBody .= '
          <tr>
            <td colspan="2" style="padding:14px 20px;border-top:1px solid #e0e0e0;font-size:12px;color:#666;">
              If anything looks incorrect, just reply to this email and we will update your order.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';

    send_via_gmail(
        $email,
        $custSubject,
        $custBody,
        'orders@mobileamericannotary.com',
        'Mobile American Notary'
    );
}

// ========== THANK-YOU PAGE ==========

$willMailDocs = ($deliveryMethod === 'mail_to_office');
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

