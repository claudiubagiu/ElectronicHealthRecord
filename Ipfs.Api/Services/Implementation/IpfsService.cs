using FluentResults;
using Ipfs.Api.Models.Domain;
using Ipfs.Api.Models.DTOs;
using Ipfs.Api.Services.Interface;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Ipfs.Api.Services.Implementation
{
    /// <summary>
    /// Service that proxies encrypted diagnostic payloads to and from
    /// Pinata's IPFS pinning API.
    ///
    /// Upload serialises the DTO as JSON and pins it as a single file.
    /// Download fetches the JSON from the IPFS gateway and deserialises it.
    /// </summary>
    public class IpfsService : IIpfsService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiUrl;
        private readonly string _gatewayUrl;

        /// <summary>
        /// Initialises the service with an HttpClient and reads Pinata
        /// configuration (API key, secret, URLs) from appsettings.
        /// </summary>
        /// <param name="httpClient">Injected HttpClient instance.</param>
        /// <param name="config">Application configuration containing the Pinata section.</param>
        public IpfsService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _apiUrl = config["Pinata:ApiUrl"]!;
            _gatewayUrl = config["Pinata:GatewayUrl"]!;

            _httpClient.DefaultRequestHeaders.Add("pinata_api_key", config["Pinata:ApiKey"]);
            _httpClient.DefaultRequestHeaders.Add("pinata_secret_api_key", config["Pinata:SecretKey"]);
        }

        /// <summary>
        /// Serialises the encrypted payload as JSON and pins it to IPFS via Pinata.
        /// </summary>
        /// <param name="request">The encrypted payload DTO with Base64-encoded binary fields.</param>
        /// <returns>A <see cref="Result{T}"/> containing the IPFS CID on success, or an error.</returns>
        public async Task<Result<string>> UploadEncryptedDataAsync(UploadEncryptedDataRequestDto request)
        {
            try
            {
                var json = JsonSerializer.Serialize(request);
                var jsonBytes = Encoding.UTF8.GetBytes(json);

                using var content = new MultipartFormDataContent();
                var fileContent = new ByteArrayContent(jsonBytes);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                content.Add(fileContent, "file", "encrypted-data.json");

                var response = await _httpClient.PostAsync($"{_apiUrl}/pinFileToIPFS", content);
                response.EnsureSuccessStatusCode();

                var responseBody = await response.Content.ReadAsStringAsync();
                var pinataResponse = JsonSerializer.Deserialize<PinataUploadResponse>(responseBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return Result.Ok(pinataResponse!.IpfsHash);
            }
            catch (Exception ex)
            {
                return Result.Fail<string>(new Error("IPFS upload failed.").CausedBy(ex));
            }
        }

        /// <summary>
        /// Downloads an encrypted payload from IPFS by its CID and deserialises the JSON.
        /// </summary>
        /// <param name="cid">The IPFS content identifier of the pinned payload.</param>
        /// <returns>A <see cref="Result{T}"/> containing the deserialised response DTO, or an error.</returns>
        public async Task<Result<EncryptedDataResponseDto>> DownloadEncryptedDataAsync(string cid)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_gatewayUrl}/{cid}");
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<EncryptedDataResponseDto>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return Result.Ok(data!);
            }
            catch (Exception ex)
            {
                return Result.Fail<EncryptedDataResponseDto>(new Error("IPFS download failed.").CausedBy(ex));
            }
        }
    }
}