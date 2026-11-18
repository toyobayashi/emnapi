export function constexprChoice() {
    __emnapi_conditional_if__("MEMORY64 == 1");
    return 64;
    __emnapi_conditional_elif__("MEMORY64 == 0");
    return 32;
    __emnapi_conditional_else__();
    return 0;
    __emnapi_conditional_endif__();
}
