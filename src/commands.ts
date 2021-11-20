const enum COMMAMD_REQUIREMENTS {
    // Enums for command requirements
    // Multiple requirements can be ORed together
    REQUIRE_QUEUE_NON_EMPTY = 1,
    REQUIRE_IS_PLAYING = 2,
    REQUIRE_USER_IN_VC = 4
}

export default COMMAMD_REQUIREMENTS;
