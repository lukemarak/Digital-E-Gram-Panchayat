<?php
header("Content-Type: application/json");

if (!isset($_FILES["file"], $_POST["appId"])) {
  echo json_encode(["success" => false]);
  exit;
}

$appId = preg_replace("/[^a-zA-Z0-9]/", "", $_POST["appId"]);
$baseDir = __DIR__ . "/uploads/certificates/$appId/";

if (!is_dir($baseDir)) {
  mkdir($baseDir, 0755, true);
}

$file = $_FILES["file"];
$ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));

if ($ext !== "pdf") {
  echo json_encode(["success" => false, "error" => "Only PDF allowed"]);
  exit;
}

$filename = "certificate.pdf";
$target = $baseDir . $filename;

if (!move_uploaded_file($file["tmp_name"], $target)) {
  echo json_encode(["success" => false]);
  exit;
}

echo json_encode([
  "success" => true,
//   "path" => "/uploads/certificates/$appId/$filename"
"path" => "uploads/certificates/$appId/certificate.pdf"

]);
