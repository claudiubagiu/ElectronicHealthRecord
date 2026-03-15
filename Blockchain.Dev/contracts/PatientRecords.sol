// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PatientRecords
 * @notice Electronic Health Record access control + diagnosis registry.
 *         Compatible with Lit Protocol's `hasAccess(address patient, address doctor)` ACC.
 *
 * Flow:
 *  1. Patient grants/revokes read-access to a doctor (for Lit Protocol decryption).
 *  2. Doctor proposes a diagnosis OFF-CHAIN (UI / traditional DB / push notification).
 *  3. Patient reviews the proposal in the UI and clicks "Approve".
 *  4. Patient's wallet calls `addDiagnosis()` — only the patient can write their own record.
 *  5. Lit Protocol calls `hasAccess()` on-chain to decide who can decrypt the IPFS document.
 */
contract PatientRecords {

    // ─────────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────────

    struct Diagnosis {
        uint256 id;           // auto-incremented
        string  title;        // e.g. "Chest X-Ray Report"
        string  ipfsCid;      // CID of the Lit-encrypted document on IPFS
        uint256 timestamp;    // block.timestamp at approval
        address doctorAddr;   // address of the proposing doctor
        string  doctorName;   // human-readable doctor name (for UX)
        address patientAddr;  // msg.sender — the patient who approved
        bool    exists;       // guard flag
    }

    // ─────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────

    /// diagnosisId → Diagnosis
    mapping(uint256 => Diagnosis) private _diagnoses;
    uint256 private _nextId;

    /// patient → doctor → has read-access?
    mapping(address => mapping(address => bool)) private _access;

    /// patient → list of their diagnosis IDs
    mapping(address => uint256[]) private _patientDiagnoses;

    /// doctor → list of diagnosis IDs where they are the proposer
    mapping(address => uint256[]) private _doctorDiagnoses;

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────

    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    event DiagnosisAdded(
        uint256 indexed diagnosisId,
        address indexed patient,
        address indexed doctor,
        string  ipfsCid,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────
    //  ACCESS CONTROL  (called by patients)
    // ─────────────────────────────────────────────

    function grantAccess(address doctor) external {
        require(doctor != address(0), "PatientRecords: zero address");
        require(doctor != msg.sender, "PatientRecords: cannot grant access to yourself");
        _access[msg.sender][doctor] = true;
        emit AccessGranted(msg.sender, doctor);
    }

    function revokeAccess(address doctor) external {
        _access[msg.sender][doctor] = false;
        emit AccessRevoked(msg.sender, doctor);
    }

    /**
     * @notice Called by Lit Protocol ACC: hasAccess(patientAddress, :userAddress)
     */
    function hasAccess(address patient, address doctor) external view returns (bool) {
        if (doctor == patient) return true;
        return _access[patient][doctor];
    }

    // ─────────────────────────────────────────────
    //  DIAGNOSIS REGISTRY  (called by the PATIENT after UI approval)
    // ─────────────────────────────────────────────

    /**
     * @notice Patient approves a doctor's off-chain proposal and stores it on-chain.
     *         msg.sender = patient (the one clicking "Approve" in the UI).
     *         doctorAddr = passed in from the off-chain proposal data.
     *
     * @param title       Short title (e.g. "MRI – Lumbar Spine").
     * @param ipfsCid     IPFS CID of the Lit-encrypted document.
     * @param doctorAddr  Wallet address of the proposing doctor.
     * @param doctorName  Human-readable doctor name.
     * @return id         The on-chain diagnosis ID.
     */
    function addDiagnosis(
        string  calldata title,
        string  calldata ipfsCid,
        address          doctorAddr,
        string  calldata doctorName
    )
        external
        returns (uint256 id)
    {
        require(bytes(title).length   > 0, "PatientRecords: empty title");
        require(bytes(ipfsCid).length > 0, "PatientRecords: empty CID");
        require(doctorAddr != address(0),  "PatientRecords: zero doctor address");
        require(doctorAddr != msg.sender,  "PatientRecords: doctor must differ from patient");

        id = _nextId++;

        _diagnoses[id] = Diagnosis({
            id:          id,
            title:       title,
            ipfsCid:     ipfsCid,
            timestamp:   block.timestamp,
            doctorAddr:  doctorAddr,
            doctorName:  doctorName,
            patientAddr: msg.sender,
            exists:      true
        });

        _patientDiagnoses[msg.sender].push(id);
        _doctorDiagnoses[doctorAddr].push(id);

        emit DiagnosisAdded(id, msg.sender, doctorAddr, ipfsCid, block.timestamp);
    }

    // ─────────────────────────────────────────────
    //  QUERIES
    // ─────────────────────────────────────────────

    function getDiagnosis(uint256 diagnosisId)
        external
        view
        returns (Diagnosis memory)
    {
        Diagnosis storage d = _diagnoses[diagnosisId];
        require(d.exists, "PatientRecords: diagnosis not found");
        require(
            msg.sender == d.patientAddr || _access[d.patientAddr][msg.sender],
            "PatientRecords: not authorized"
        );
        return d;
    }

    function getPatientDiagnosisIds(address patient)
        external
        view
        returns (uint256[] memory)
    {
        require(
            msg.sender == patient || _access[patient][msg.sender],
            "PatientRecords: not authorized"
        );
        return _patientDiagnoses[patient];
    }

    function getDoctorDiagnosisIds() external view returns (uint256[] memory) {
        return _doctorDiagnoses[msg.sender];
    }

    function totalDiagnoses() external view returns (uint256) {
        return _nextId;
    }
}
