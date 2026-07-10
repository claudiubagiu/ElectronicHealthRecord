// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EHRAccess {

    enum Role { NONE, DOCTOR, LAB_TECH, PHARMACIST, MEDICAL_ASSISTANT }

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

    address public owner;

    mapping(address => Role) private _roles;

    mapping(address => mapping(address => uint256)) private _accessExpiry;

    mapping(uint256 => Diagnosis)  private _diagnoses;
    uint256 private _nextDiagnosisId;

    mapping(uint256 => LabAnalysis) private _labAnalyses;
    uint256 private _nextLabAnalysisId;

    mapping(uint256 => Prescription) private _prescriptions;
    uint256 private _nextPrescriptionId = 1;

    mapping(bytes32 => uint256)   private _codeHashToPrescriptionId;
    mapping(address => uint256[]) private _patientPrescriptions;
    mapping(address => uint256[]) private _doctorPrescriptions;
    mapping(address => uint256[]) private _dispensedBy;

    mapping(address => uint256[]) private _patientDiagnoses;
    mapping(address => uint256[]) private _doctorDiagnoses;

    mapping(address => uint256[]) private _patientLabAnalyses;
    mapping(address => uint256[]) private _labTechAnalyses;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RoleAssigned(address indexed account, Role role);
    event RoleRevoked(address indexed account);

    event AccessGranted(address indexed patient, address indexed medic, uint256 expiresAt);
    event AccessRevoked(address indexed patient, address indexed medic);

    event DiagnosisAdded(uint256 indexed id, address indexed patient, address indexed doctor, string ipfsCid, uint256 timestamp);
    event LabAnalysisAdded(uint256 indexed id, address indexed patient, address indexed labTech, string ipfsCid, uint256 timestamp);
    event PrescriptionAdded(uint256 indexed id, address indexed patient, address indexed doctor, string ipfsCid, uint256 timestamp);
    event PrescriptionDispensed(uint256 indexed id, address indexed dispensedBy, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyRole(Role role) {
        require(_roles[msg.sender] == role, "wrong role");
        _;
    }

    modifier hasAccess(address patient) {
        require(_accessExpiry[patient][msg.sender] > block.timestamp, "no access");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function assignRole(address account, Role role) external onlyOwner {
        require(account != address(0), "zero address");
        require(role != Role.NONE, "use revokeRole");
        _roles[account] = role;
        emit RoleAssigned(account, role);
    }

    function revokeRole(address account) external onlyOwner {
        require(_roles[account] != Role.NONE, "no role");
        _roles[account] = Role.NONE;
        emit RoleRevoked(account);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function getRole(address account) external view returns (Role) {
        return _roles[account];
    }

    function grantAccess(address medic, uint256 durationSeconds) external {
        require(medic != address(0), "zero address");
        require(medic != msg.sender, "self-grant");
        require(durationSeconds > 0, "zero duration");
        uint256 expiresAt = block.timestamp + durationSeconds;
        _accessExpiry[msg.sender][medic] = expiresAt;
        emit AccessGranted(msg.sender, medic, expiresAt);
    }

    function revokeAccess(address medic) external {
        _accessExpiry[msg.sender][medic] = 0;
        emit AccessRevoked(msg.sender, medic);
    }
 
    function hasAccessView(address patient, address medic) external view returns (bool) {
        if (medic == patient) return true;
        return _accessExpiry[patient][medic] > block.timestamp;
    }

    function getAccessExpiry(address patient, address medic) external view returns (uint256) {
        return _accessExpiry[patient][medic];
    }

    function addDiagnosis(
        string  calldata title,
        string  calldata ipfsCid,
        address          patientAddr,
        string  calldata doctorName
    )
        external
        onlyRole(Role.DOCTOR)
        hasAccess(patientAddr)
        returns (uint256 id)
    {
        require(bytes(title).length   > 0, "empty title");
        require(bytes(ipfsCid).length > 0, "empty CID");
        require(patientAddr != address(0), "zero address");
        require(patientAddr != msg.sender, "self-diagnosis");

        id = _nextDiagnosisId++;
        _diagnoses[id] = Diagnosis(id, title, ipfsCid, block.timestamp, msg.sender, doctorName, patientAddr, true);
        _patientDiagnoses[patientAddr].push(id);
        _doctorDiagnoses[msg.sender].push(id);
        emit DiagnosisAdded(id, patientAddr, msg.sender, ipfsCid, block.timestamp);
    }

    function getDiagnosis(uint256 diagnosisId) external view returns (Diagnosis memory) {
        Diagnosis storage d = _diagnoses[diagnosisId];
        require(d.exists, "not found");
        require(
            msg.sender == d.patientAddr ||
            _accessExpiry[d.patientAddr][msg.sender] > block.timestamp,
            "not authorized"
        );
        return d;
    }

    function getPatientDiagnosisIds(address patient) external view returns (uint256[] memory) {
        require(
            msg.sender == patient ||
            _accessExpiry[patient][msg.sender] > block.timestamp,
            "not authorized"
        );
        return _patientDiagnoses[patient];
    }

    function getDoctorDiagnosisIds() external view returns (uint256[] memory) {
        return _doctorDiagnoses[msg.sender];
    }

    function totalDiagnoses() external view returns (uint256) {
        return _nextDiagnosisId;
    }

    function getDoctorDiagnosesSummary() external view returns (Diagnosis[] memory result) {
        uint256[] storage ids = _doctorDiagnoses[msg.sender];
        result = new Diagnosis[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _diagnoses[ids[i]];
        }
    }

    function addLabAnalysis(
        string  calldata title,
        string  calldata ipfsCid,
        address          patientAddr,
        string  calldata labTechName
    )
        external
        onlyRole(Role.LAB_TECH)
        hasAccess(patientAddr)
        returns (uint256 id)
    {
        require(bytes(title).length   > 0, "empty title");
        require(bytes(ipfsCid).length > 0, "empty CID");
        require(patientAddr != address(0), "zero address");
        require(patientAddr != msg.sender, "self-analysis");

        id = _nextLabAnalysisId++;
        _labAnalyses[id] = LabAnalysis(id, title, ipfsCid, block.timestamp, msg.sender, labTechName, patientAddr, true);
        _patientLabAnalyses[patientAddr].push(id);
        _labTechAnalyses[msg.sender].push(id);
        emit LabAnalysisAdded(id, patientAddr, msg.sender, ipfsCid, block.timestamp);
    }

    function getLabAnalysis(uint256 labAnalysisId) external view returns (LabAnalysis memory) {
        LabAnalysis storage l = _labAnalyses[labAnalysisId];
        require(l.exists, "not found");
        require(
            msg.sender == l.patientAddr ||
            _accessExpiry[l.patientAddr][msg.sender] > block.timestamp,
            "not authorized"
        );
        return l;
    }

    function getPatientLabAnalysisIds(address patient) external view returns (uint256[] memory) {
        require(
            msg.sender == patient ||
            _accessExpiry[patient][msg.sender] > block.timestamp,
            "not authorized"
        );
        return _patientLabAnalyses[patient];
    }

    function getLabTechAnalysisIds() external view returns (uint256[] memory) {
        return _labTechAnalyses[msg.sender];
    }

    function totalLabAnalyses() external view returns (uint256) {
        return _nextLabAnalysisId;
    }

    function getLabTechAnalysesSummary() external view returns (LabAnalysis[] memory result) {
        uint256[] storage ids = _labTechAnalyses[msg.sender];
        result = new LabAnalysis[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _labAnalyses[ids[i]];
        }
    }

    function addPrescription(
        string  calldata title,
        string  calldata ipfsCid,
        address          patientAddr,
        string  calldata doctorName,
        bytes32          codeHash,
        bytes32          salt
    )
        external
        onlyRole(Role.DOCTOR)
        hasAccess(patientAddr)
        returns (uint256 id)
    {
        require(bytes(title).length   > 0, "empty title");
        require(bytes(ipfsCid).length > 0, "empty CID");
        require(patientAddr != address(0), "zero address");
        require(patientAddr != msg.sender, "self-prescription");
        require(_codeHashToPrescriptionId[codeHash] == 0, "hash collision");

        id = _nextPrescriptionId++;
        _prescriptions[id] = Prescription(
            id, title, ipfsCid, patientAddr, msg.sender, doctorName,
            block.timestamp, codeHash, salt,
            false, 0, address(0), true
        );
        _codeHashToPrescriptionId[codeHash] = id;
        _patientPrescriptions[patientAddr].push(id);
        _doctorPrescriptions[msg.sender].push(id);
        emit PrescriptionAdded(id, patientAddr, msg.sender, ipfsCid, block.timestamp);
    }

    function dispensePrescription(bytes32 codeHash) external onlyRole(Role.PHARMACIST) {
        uint256 id = _codeHashToPrescriptionId[codeHash];
        require(id != 0, "not found");
        Prescription storage p = _prescriptions[id];
        require(!p.dispensed, "already dispensed");
        p.dispensed          = true;
        p.dispensedBy        = msg.sender;
        p.dispensedTimestamp = block.timestamp;
        _dispensedBy[msg.sender].push(id);
        emit PrescriptionDispensed(id, msg.sender, block.timestamp);
    }

    function getPrescriptionByCodeHash(bytes32 codeHash) external view returns (Prescription memory) {
        uint256 id = _codeHashToPrescriptionId[codeHash];
        require(id != 0, "not found");
        Prescription storage p = _prescriptions[id];
        require(
            msg.sender == p.patientAddr ||
            _accessExpiry[p.patientAddr][msg.sender] > block.timestamp ||
            _roles[msg.sender] == Role.PHARMACIST,
            "not authorized"
        );
        return p;
    }

    function getPrescription(uint256 prescriptionId) external view returns (Prescription memory) {
        Prescription storage p = _prescriptions[prescriptionId];
        require(p.exists, "not found");
        require(
            msg.sender == p.patientAddr ||
            _accessExpiry[p.patientAddr][msg.sender] > block.timestamp,
            "not authorized"
        );
        return p;
    }

    function getPatientPrescriptionIds(address patient) external view returns (uint256[] memory) {
        require(
            msg.sender == patient ||
            _accessExpiry[patient][msg.sender] > block.timestamp,
            "not authorized"
        );
        return _patientPrescriptions[patient];
    }

    function getDoctorPrescriptionIds() external view returns (uint256[] memory) {
        return _doctorPrescriptions[msg.sender];
    }

    function getDoctorPrescriptionsSummary() external view returns (Prescription[] memory result) {
        uint256[] storage ids = _doctorPrescriptions[msg.sender];
        result = new Prescription[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _prescriptions[ids[i]];
        }
    }

    function getPharmacistDispensedSummary() external view returns (Prescription[] memory result) {
        uint256[] storage ids = _dispensedBy[msg.sender];
        result = new Prescription[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _prescriptions[ids[i]];
        }
    }
}
