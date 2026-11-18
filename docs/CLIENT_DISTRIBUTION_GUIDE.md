# SSC Board App — Complete Offline DRM & Client Distribution Guide

This guide provides end-to-end instructions for preparing, encrypting, licensing, and distributing the **SSC Board Learning App** to schools, institutions, and individual students completely offline without risking direct access to raw textbook PDFs, videos, or database files.

---

## 1. Architectural Security Overview

```
                      +---------------------------------------+
                      | Raw Course Materials (PDFs / Videos)  |
                      +---------------------------------------+
                                          |
                                          | node scripts/pack-content.js
                                          v
                      +---------------------------------------+
                      | Encrypted Content Packs (*.enc)       |
                      |   - AES-256-CTR Counter Mode          |
                      |   - Zero-Disk Decryption              |
                      +---------------------------------------+
                                          |
                  +-----------------------+-----------------------+
                  |                                               |
                  v                                               v
        [OTG Pen Drive / SD Card]                      [Client-Branded APK]
       /sdcard/Download/SSCBoard/                       Custom client ID,
            offline_content/                            secret & watermark
                  |                                               |
                  +-----------------------+-----------------------+
                                          |
                                          v
                         +---------------------------------+
                         |      Student Physical Device    |
                         |   - Loopback HTTP Stream Server |
                         |   - Hardware Fingerprint ID     |
                         |   - Offline HMAC-SHA256 License |
                         +---------------------------------+
```

### Core Security Guarantees:
1. **Zero Raw Files on Disk**: Neither videos nor PDFs are ever written to unencrypted temporary files or flash storage. Everything streams directly into player memory via dynamic loopback sockets (`127.0.0.1:<random_port>`).
2. **Hardware Fingerprint Binding**: Each device generates a unique hardware fingerprint derived from Android ID, device manufacturer, board, and hardware model. License keys generated for one device **cannot** be used on any other device.
3. **HTTP 206 Byte-Range Seeking**: Video scrub bars and PDF page navigation perform $O(1)$ Counter-mode block offset calculations, allowing instant seeking without decrypting preceding bytes.
4. **Client-Specific Branded Watermarking**: Canvas rendering for PDFs dynamically injects tamper-proof diagonal watermarks with client organization branding.

---

## 2. Step 1: Packaging & Encrypting Offline Content

Place all raw textbook PDFs and MP4 video lessons into a source directory:

```
raw_materials/
├── videos/
│   ├── lesson_01_gravitation.mp4
│   └── lesson_02_periodic_table.mp4
└── pdfs/
    ├── science_part1_class10.pdf
    └── mathematics_part1_class10.pdf
```

Run the content packaging tool:

```bash
node scripts/pack-content.js --input raw_materials --output encrypted_pack --client ssc_softspire_default
```

### What Happens:
- Each file is encrypted with AES-256-CTR using a key derived from `(masterSecret + clientId + clientSecret)`.
- A 32-byte header is prepended (`SSCE` magic + version byte + client hash + 16-byte random IV).
- An encrypted manifest `content-manifest.json.enc` is created with checksums and byte counts.
- Resulting files (`.enc`) are safe to copy onto public USB drives, external SD cards, or download portals.

---

## 3. Step 2: Compiling Client-Specific APKs

The app supports multiple client editions (e.g., specific schools, tutorial centers, or corporate distributions) through profile JSON files in `clients/`.

Available Profiles:
- `clients/softspire_default.json` (Default edition, classes 1–10)
- `clients/school_pune_model.json` (Custom school edition, classes 8–10, strict offline mode)

### Build a Client Release APK:

```bash
# Build default edition:
node scripts/build-client-apk.js --client softspire_default

# Build custom school edition:
node scripts/build-client-apk.js --client school_pune_model
```

The script will:
1. Inject client secrets, branding, and allowed class IDs into `src/config/clientConfig.ts`.
2. Configure watermarks and offline fallback policies.
3. Assemble the release APK (`assembleRelease`).
4. Output signed APK to `dist/app-<client>-release.apk`.

---

## 4. Step 3: Copying Content to Student Devices

Distribute the encrypted folder onto the student's phone or tablet using any of these methods:

### Method A: Via USB OTG Pen Drive or Computer
Connect device to PC/OTG and copy `encrypted_pack` contents to:
```
/sdcard/Download/SSCBoard/offline_content/
```
Structure on device:
```
/sdcard/Download/SSCBoard/offline_content/
├── videos/
│   ├── lesson_01_gravitation.mp4.enc
│   └── lesson_02_periodic_table.mp4.enc
└── pdfs/
    ├── science_part1_class10.pdf.enc
    └── mathematics_part1_class10.pdf.enc
```

*Note: The app automatically searches 7 candidate locations, including internal storage Downloads, Documents, and app-private storage.*

---

## 5. Step 4: Generating Offline Cryptographic Licenses

When a student opens the app offline without an active license, they can find their **Hardware Device ID** in either:
- **Profile Screen** $\rightarrow$ **Offline Storage & DRM** $\rightarrow$ Tap **Copy**
- Or on the **License Activation Screen** when opening a locked class.

The student shares their Device ID (e.g., `7f4a2b1c8e90`) with the distributor.

### Generate a Single-Class License Key:
```bash
node scripts/generate-license.js --device "7f4a2b1c8e90" --class 10 --client ssc_softspire_default
```
**Output:**
```
  🔑 ACTIVATION KEY:  CL10-AC1B-5416-29C5
```

### Generate a Full Curriculum (All Classes) Pass:
```bash
node scripts/generate-license.js --device "7f4a2b1c8e90" --class all --client ssc_softspire_default
```
**Output:**
```
  🔑 ACTIVATION KEY:  CALL-E589-579A-64FB
```

### Generate a Key for a Custom School Edition:
```bash
node scripts/generate-license.js --device "7f4a2b1c8e90" --class 10 --client school_pune_model_001
```

---

## 6. Step 5: In-App Activation & Playback

1. Student opens the app on their device.
2. Selects **Class 10** $\rightarrow$ App prompts: **Activate Class 10**.
3. Student enters the activation key (e.g., `CL10-AC1B-5416-29C5`).
4. The app cryptographically verifies the HMAC signature using the baked client secret and the physical device hardware.
5. **Instant Unlock**:
   - The license is registered in local SQLite (`licenses` table).
   - Video lessons and textbook PDFs display green **[Offline Ready ⚡]** badges.
   - When tapped, the native loopback server (`127.0.0.1`) streams decrypted media seamlessly with zero lag.

---

## 7. Storage Management & Rescanning

To verify or update content on a device:
1. Navigate to **Profile** $\rightarrow$ **Offline Storage & DRM**.
2. View:
   - DRM Stream Server status (`127.0.0.1 - Active & Protected`).
   - Hardware Device ID with one-touch copy.
   - Detected count of videos and PDFs.
3. Tap **Rescan Storage** to instantly detect newly copied files from a pen drive.

---

## 8. Command Reference Summary

| Task | Command |
|---|---|
| Encrypt Raw Videos & PDFs | `node scripts/pack-content.js --input <dir> --output <dir>` |
| Test Encryption Pipeline | `node scripts/test-encryption-pipeline.js` |
| Generate Device License | `node scripts/generate-license.js --device <id> --class <id\|all>` |
| Build Branded Release APK | `node scripts/build-client-apk.js --client <client_name>` |
