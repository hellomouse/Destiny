// eslint-disable-next-line @typescript-eslint/naming-convention
enum COMMAMD_REQUIREMENTS {
    // Enums for command requirements
    // Multiple requirements can be ORed together
    REQUIRE_QUEUE_NON_EMPTY = 1, // eslint-disable-line @typescript-eslint/naming-convention
    REQUIRE_IS_PLAYING = 2, // eslint-disable-line @typescript-eslint/naming-convention
    REQUIRE_USER_IN_VC = 4 // eslint-disable-line @typescript-eslint/naming-convention
}

export default COMMAMD_REQUIREMENTS;
