// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EHRAccess {

    // ── Structs ──────────────────────────────────────────────────────────────

    struct Diagnosis {
        uint256 id;
        string  title;
        string  ipfsCid;
        uint256 timestamp;
        address doctorAddr;
        string  doctorName;
        address patientAddr;
        bool    exists;
    }

    struct LabAnalysis {
        uint256 id;
        string  title;
        string  ipfsCid;
        uint256 timestamp;
        address labTechAddr;
        string  labTechName;
        address patientAddr;
        bool    exists;
    }

    // ── Storage ──────────────────────────────────────────────────────────────

    mapping(uint256 => Diagnosis)   private _diagnoses;
    uint256 private _nextDiagnosisId;

    mapping(uint256 => LabAnalysis) private _labAnalyses;
    uint256 private _nextLabAnalysisId;

    // Changed: bool → uint256 (expiry timestamp). 0 = no access.
    mapping(address => mapping(address => uint256)) private _accessExpiry;
    mapping(address => uint256[]) private _patientDiagnoses;
    mapping(address => uint256[]) private _doctorDiagnoses;

    mapping(address => uint256[]) private _patientLabAnalyses;
    mapping(address => uint256[]) private _labTechAnalyses;

    // ── Events ───────────────────────────────────────────────────────────────

    event AccessGranted(address indexed patient, address indexed doctor, uint256 expiresAt);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event DiagnosisAdded(
        uint256 indexed diagnosisId,
        address indexed patient,
        address indexed doctor,
        string  ipfsCid,
        uint256 timestamp
    );
    event LabAnalysisAdded(
        uint256 indexed labAnalysisId,
        address indexed patient,
        address indexed labTech,
        string  ipfsCid,
        uint256 timestamp
    );

    // ── Access Control ───────────────────────────────────────────────────────

    /// @notice Patient grants time-limited access to a doctor or lab technician.
    function grantAccess(address doctor, uint256 durationSeconds) external {
        require(doctor != address(0), "EHRAccess: zero address");
        require(doctor != msg.sender, "EHRAccess: cannot grant access to yourself");
        require(durationSeconds > 0, "EHRAccess: duration must be positive");

        uint256 expiresAt = block.timestamp + durationSeconds;
        _accessExpiry[msg.sender][doctor] = expiresAt;
        emit AccessGranted(msg.sender, doctor, expiresAt);
    }

    function revokeAccess(address doctor) external {
        _accessExpiry[msg.sender][doctor] = 0;
        emit AccessRevoked(msg.sender, doctor);
    }

    /// @notice Returns true only if access exists AND has not expired.
    function hasAccess(address patient, address doctor) external view returns (bool) {
        if (doctor == patient) return true;
        uint256 expiry = _accessExpiry[patient][doctor];
        return expiry > block.timestamp;
    }

    /// @notice Returns the expiry timestamp (0 if no access).
    function getAccessExpiry(address patient, address doctor) external view returns (uint256) {
        return _accessExpiry[patient][doctor];
    }

    // ── Diagnoses ────────────────────────────────────────────────────────────

    function addDiagnosis(
        string  calldata title,
        string  calldata ipfsCid,
        address          patientAddr,
        string  calldata doctorName
    )
        external
        returns (uint256 id)
    {
        require(bytes(title).length   > 0, "EHRAccess: empty title");
        require(bytes(ipfsCid).length > 0, "EHRAccess: empty CID");
        require(patientAddr != address(0),  "EHRAccess: zero patient address");
        require(patientAddr != msg.sender,  "EHRAccess: doctor must differ from patient");

        id = _nextDiagnosisId++;

        _diagnoses[id] = Diagnosis({
            id:          id,
            title:       title,
            ipfsCid:     ipfsCid,
            timestamp:   block.timestamp,
            doctorAddr:  msg.sender,
            doctorName:  doctorName,
            patientAddr: patientAddr,
            exists:      true
        });

        _patientDiagnoses[patientAddr].push(id);
        _doctorDiagnoses[msg.sender].push(id);

        emit DiagnosisAdded(id, patientAddr, msg.sender, ipfsCid, block.timestamp);
    }

    function getDiagnosis(uint256 diagnosisId)
        external
        view
        returns (Diagnosis memory)
    {
        Diagnosis storage d = _diagnoses[diagnosisId];
        require(d.exists, "EHRAccess: diagnosis not found");
        require(
            msg.sender == d.patientAddr ||
            (_accessExpiry[d.patientAddr][msg.sender] > block.timestamp),
            "EHRAccess: not authorized"
        );
        return d;
    }

    function getPatientDiagnosisIds(address patient)
        external
        view
        returns (uint256[] memory)
    {
        require(
            msg.sender == patient ||
            (_accessExpiry[patient][msg.sender] > block.timestamp),
            "EHRAccess: not authorized"
        );
        return _patientDiagnoses[patient];
    }

    function getDoctorDiagnosisIds() external view returns (uint256[] memory) {
        return _doctorDiagnoses[msg.sender];
    }

    function totalDiagnoses() external view returns (uint256) {
        return _nextDiagnosisId;
    }

    // ── Lab Analyses ─────────────────────────────────────────────────────────

    /// @notice Lab technician uploads an analysis for a patient.
    /// @param title Short label for the analysis (e.g. "Complete Blood Count").
    /// @param ipfsCid IPFS CID of the encrypted PDF.
    /// @param patientAddr The patient's wallet address.
    /// @param labTechName Display name of the lab technician.
    function addLabAnalysis(
        string  calldata title,
        string  calldata ipfsCid,
        address          patientAddr,
        string  calldata labTechName
    )
        external
        returns (uint256 id)
    {
        require(bytes(title).length   > 0, "EHRAccess: empty title");
        require(bytes(ipfsCid).length > 0, "EHRAccess: empty CID");
        require(patientAddr != address(0),  "EHRAccess: zero patient address");
        require(patientAddr != msg.sender,  "EHRAccess: lab tech must differ from patient");

        id = _nextLabAnalysisId++;

        _labAnalyses[id] = LabAnalysis({
            id:          id,
            title:       title,
            ipfsCid:     ipfsCid,
            timestamp:   block.timestamp,
            labTechAddr: msg.sender,
            labTechName: labTechName,
            patientAddr: patientAddr,
            exists:      true
        });

        _patientLabAnalyses[patientAddr].push(id);
        _labTechAnalyses[msg.sender].push(id);

        emit LabAnalysisAdded(id, patientAddr, msg.sender, ipfsCid, block.timestamp);
    }

    /// @notice Fetch a single lab analysis. Caller must be the patient or have active access.
    function getLabAnalysis(uint256 labAnalysisId)
        external
        view
        returns (LabAnalysis memory)
    {
        LabAnalysis storage a = _labAnalyses[labAnalysisId];
        require(a.exists, "EHRAccess: lab analysis not found");
        require(
            msg.sender == a.patientAddr ||
            msg.sender == a.labTechAddr ||
            (_accessExpiry[a.patientAddr][msg.sender] > block.timestamp),
            "EHRAccess: not authorized"
        );
        return a;
    }

    /// @notice Returns all lab analysis IDs for a given patient.
    function getPatientLabAnalysisIds(address patient)
        external
        view
        returns (uint256[] memory)
    {
        require(
            msg.sender == patient ||
            (_accessExpiry[patient][msg.sender] > block.timestamp),
            "EHRAccess: not authorized"
        );
        return _patientLabAnalyses[patient];
    }

    /// @notice Returns all lab analysis IDs submitted by the calling lab technician.
    function getLabTechAnalysisIds() external view returns (uint256[] memory) {
        return _labTechAnalyses[msg.sender];
    }

    function totalLabAnalyses() external view returns (uint256) {
        return _nextLabAnalysisId;
    }
}