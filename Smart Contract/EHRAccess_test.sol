// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "remix_tests.sol";
import "remix_accounts.sol";
import "../EHRAccess.sol";

contract EHRAccessTest {
    EHRAccess ehrAccess;

    function beforeEach() public {
        ehrAccess = new EHRAccess();
    }

    function testAssignDoctorRoleSucceeds() public {
        address doctor = address(0x1);
        ehrAccess.assignRole(doctor, EHRAccess.Role.DOCTOR);
        Assert.equal(
            uint(ehrAccess.getRole(doctor)),
            uint(EHRAccess.Role.DOCTOR),
            "Role should be DOCTOR"
        );
    }

    function testAssignLabTechRoleSucceeds() public {
        address labTech = address(0x2);
        ehrAccess.assignRole(labTech, EHRAccess.Role.LAB_TECH);
        Assert.equal(
            uint(ehrAccess.getRole(labTech)),
            uint(EHRAccess.Role.LAB_TECH),
            "Role should be LAB_TECH"
        );
    }

    function testAssignRoleToZeroAddressFails() public {
        try ehrAccess.assignRole(address(0), EHRAccess.Role.DOCTOR) {
            Assert.ok(false, "Should have reverted");
        } catch {
            Assert.ok(true, "Correctly reverted for zero address");
        }
    }

    function testAssignNoneRoleFails() public {
        address doctor = address(0x1);
        try ehrAccess.assignRole(doctor, EHRAccess.Role.NONE) {
            Assert.ok(false, "Should have reverted");
        } catch {
            Assert.ok(true, "Correctly reverted for NONE role");
        }
    }

    function testRevokeRoleSucceeds() public {
        address doctor = address(0x1);
        ehrAccess.assignRole(doctor, EHRAccess.Role.DOCTOR);
        ehrAccess.revokeRole(doctor);
        Assert.equal(
            uint(ehrAccess.getRole(doctor)),
            uint(EHRAccess.Role.NONE),
            "Role should be NONE after revoke"
        );
    }

    function testRevokeRoleFailsWhenNoRole() public {
        address doctor = address(0x1);
        try ehrAccess.revokeRole(doctor) {
            Assert.ok(false, "Should have reverted");
        } catch {
            Assert.ok(true, "Correctly reverted for account with no role");
        }
    }

    function testGetRoleReturnNoneByDefault() public {
        address anyone = address(0x5);
        Assert.equal(
            uint(ehrAccess.getRole(anyone)),
            uint(EHRAccess.Role.NONE),
            "Role should be NONE by default"
        );
    }

    function testTransferOwnershipSucceeds() public {
        address newOwner = address(0x9);
        ehrAccess.transferOwnership(newOwner);
        Assert.equal(
            ehrAccess.owner(),
            newOwner,
            "Owner should be updated"
        );
    }

    function testTransferOwnershipToZeroAddressFails() public {
        try ehrAccess.transferOwnership(address(0)) {
            Assert.ok(false, "Should have reverted");
        } catch {
            Assert.ok(true, "Correctly reverted for zero address");
        }
    }

    function testHasAccessViewReturnsFalseByDefault() public {
        address doctor = address(0x1);
        address patient = address(0x2);
        Assert.equal(
            ehrAccess.hasAccessView(patient, doctor),
            false,
            "Should not have access by default"
        );
    }

    function testPatientHasAccessToThemselves() public {
        address patient = address(this);
        Assert.equal(
            ehrAccess.hasAccessView(patient, patient),
            true,
            "Patient should have access to themselves"
        );
    }

    function testGrantAccessToZeroAddressFails() public {
        try ehrAccess.grantAccess(address(0), 86400) {
            Assert.ok(false, "Should have reverted");
        } catch {
            Assert.ok(true, "Correctly reverted for zero address");
        }
    }

    function testGrantAccessWithZeroDurationFails() public {
        address doctor = address(0x1);
        try ehrAccess.grantAccess(doctor, 0) {
            Assert.ok(false, "Should have reverted");
        } catch {
            Assert.ok(true, "Correctly reverted for zero duration");
        }
    }

    function testGrantAccessToSelfFails() public {
        try ehrAccess.grantAccess(address(this), 86400) {
            Assert.ok(false, "Should have reverted");
        } catch {
            Assert.ok(true, "Correctly reverted for self-grant");
        }
    }
}