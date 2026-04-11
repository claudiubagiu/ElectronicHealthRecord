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

    struct Prescription {
        uint256 id;
        string  title;
        string  ipfsCid;
        address patientAddr;
        address doctorAddr;
        string  doctorName;
        uint256 timestamp;
        bytes32 codeHash;
        bytes32 salt;
        bool    dispensed;
        uint256 dispensedTimestamp;
        address dispensedBy;
        bool    exists;
    }

    // ── Storage ──────────────────────────────────────────────────────────────

    mapping(uint256 => Diagnosis)   private _diagnoses;
    uint256 private _nextDiagnosisId;

    mapping(uint256 => LabAnalysis) private _labAnalyses;
    uint256 private _nextLabAnalysisId;

    mapping(uint256 => Prescription)  private _prescriptions;
    uint256 private _nextPrescriptionId = 1;

    mapping(bytes32 => uint256)       private _codeHashToPrescriptionId;
    mapping(address => uint256[])     private _patientPrescriptions;
    mapping(address => uint256[])     private _doctorPrescriptions;

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

    event PrescriptionAdded(
        uint256 indexed prescriptionId,
        address indexed patient,
        address indexed doctor,
        string  ipfsCid,
        uint256 timestamp
    );

    event PrescriptionDispensed(
        uint256 indexed prescriptionId,
        address indexed dispensedBy,
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

    function getLabAnalysis(uint256 labAnalysisId)
        external
        view
        returns (LabAnalysis memory)
    {
        LabAnalysis storage l = _labAnalyses[labAnalysisId];
        require(l.exists, "EHRAccess: lab analysis not found");
        require(
            msg.sender == l.patientAddr ||
            (_accessExpiry[l.patientAddr][msg.sender] > block.timestamp),
            "EHRAccess: not authorized"
        );
        return l;
    }

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

    // ── Prescriptions ─────────────────────────────────────────────────────────

    function addPrescription(
        string  calldata title,
        string  calldata ipfsCid,
        address          patientAddr,
        string  calldata doctorName,
        bytes32          codeHash,
        bytes32          salt
    )
        external
        returns (uint256 id)
    {
        require(bytes(title).length   > 0, "EHRAccess: empty title");
        require(bytes(ipfsCid).length > 0, "EHRAccess: empty CID");
        require(patientAddr != address(0),  "EHRAccess: zero patient address");
        require(patientAddr != msg.sender,  "EHRAccess: doctor must differ from patient");
        require(
            _codeHashToPrescriptionId[codeHash] == 0,
            "EHRAccess: code hash collision"
        );

        id = _nextPrescriptionId++;

        _prescriptions[id] = Prescription({
            id:                 id,
            title:              title,
            ipfsCid:            ipfsCid,
            patientAddr:        patientAddr,
            doctorAddr:         msg.sender,
            doctorName:         doctorName,
            timestamp:          block.timestamp,
            codeHash:           codeHash,
            salt:               salt,
            dispensed:          false,
            dispensedTimestamp: 0,
            dispensedBy:        address(0),
            exists:             true
        });

        _codeHashToPrescriptionId[codeHash] = id;
        _patientPrescriptions[patientAddr].push(id);
        _doctorPrescriptions[msg.sender].push(id);

        emit PrescriptionAdded(id, patientAddr, msg.sender, ipfsCid, block.timestamp);
    }

    function getPrescriptionByCodeHash(bytes32 codeHash)
        external
        view
        returns (Prescription memory)
    {
        uint256 id = _codeHashToPrescriptionId[codeHash];
        require(id != 0, "EHRAccess: prescription not found");
        return _prescriptions[id];
    }

    function dispensePrescription(bytes32 codeHash) external {
        uint256 id = _codeHashToPrescriptionId[codeHash];
        require(id != 0, "EHRAccess: prescription not found");

        Prescription storage p = _prescriptions[id];
        require(!p.dispensed, "EHRAccess: already dispensed");

        p.dispensed          = true;
        p.dispensedBy        = msg.sender;
        p.dispensedTimestamp = block.timestamp;

        emit PrescriptionDispensed(id, msg.sender, block.timestamp);
    }

    function getPatientPrescriptionIds(address patient)
        external
        view
        returns (uint256[] memory)
    {
        require(
            msg.sender == patient ||
            (_accessExpiry[patient][msg.sender] > block.timestamp),
            "EHRAccess: not authorized"
        );
        return _patientPrescriptions[patient];
    }

    function getPrescription(uint256 prescriptionId)
        external
        view
        returns (Prescription memory)
    {
        Prescription storage p = _prescriptions[prescriptionId];
        require(p.exists, "EHRAccess: prescription not found");
        require(
            msg.sender == p.patientAddr ||
            (_accessExpiry[p.patientAddr][msg.sender] > block.timestamp),
            "EHRAccess: not authorized"
        );
        return p;
    }

    function getDoctorPrescriptionIds() external view returns (uint256[] memory) {
        return _doctorPrescriptions[msg.sender];
    }
}
